use std::collections::HashMap;

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tokio_postgres::{
    error::SqlState,
};

use crate::proxies::{java_props::save_java_prop, postgres::PostgresProxy};
use crate::proxies::{java_props::load_props, sql_common::SQLError};

use super::Endpoint;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Search,
    SaveProp,
}

#[derive(Clone, Debug)]
pub enum Status {
    Pass,
    Warn,
    Error,
}

impl Serialize for Status {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: serde::Serializer,
    {
        serializer.serialize_str(match self {
            Status::Pass => "pass",
            Status::Warn => "warn",
            Status::Error => "error",
        })
    }
}

#[derive(Clone, Serialize, Debug)]
pub struct ValidateResult {
    status: Status,
    error: Option<SQLError>,
}

impl ValidateResult {
    pub fn new(status: Status, error: Option<SQLError>) -> ValidateResult {
        ValidateResult { status, error }
    }
}

#[derive(Clone, Serialize, Debug)]
pub struct ResponseBody {
    file_props_map: HashMap<String, HashMap<String, (Option<String>, Option<String>)>>,
    file_props_valid_map: HashMap<String, HashMap<String, ValidateResult>>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Payload {
    filepath: String,
    classname: Option<String>,
    prop_key: Option<String>,
    prop_value: Option<String>,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Result<Option<ResponseBody>> {
    let Endpoint { action, payload } = endpoint;
    let Payload {
        filepath,
        classname,
        prop_key,
        prop_value
    } = payload;

    match action {
        Action::Search => {
            let file_props_map = load_props(&filepath, &classname.unwrap())?;
            log::debug!("found {} property files.", file_props_map.len());
            let queries_to_validate: HashMap<String, HashMap<String, ValidateResult>> =
                file_props_map
                    .iter()
                    .map(|(fk, fv)| {
                        let mut query_validate_map = HashMap::with_capacity(fv.len());
                        let param_stmt_list: Vec<(String, String)> = fv
                            .iter()
                            .map(|(pk, pv)| {
                                let stmt = match pv {
                                    (_, Some(pg)) => pg,
                                    (Some(ora), _) => ora,
                                    _ => "",
                                };

                                (String::from(pk), String::from(stmt))
                            })
                            .filter(|(pk, _)| !pk.to_lowercase().ends_with(".md5"))
                            .collect();

                        let stmt_list: Vec<&str> = param_stmt_list
                            .iter()
                            .map(|(_, query)| query.as_str())
                            .collect();
                        let mut validate_results: Vec<ValidateResult> =
                            generate_stmts_results(stmt_list);
                        for (i, validate_result) in validate_results.drain(..).enumerate() {
                            let (param, _) = param_stmt_list.get(i).unwrap();

                            query_validate_map.insert(String::from(param), validate_result);
                        }

                        (String::from(fk), query_validate_map)
                    })
                    .collect();

            Ok(Some(ResponseBody {
                file_props_map: file_props_map,
                file_props_valid_map: queries_to_validate,
            }))
        }
        Action::SaveProp => {
            if prop_key.is_none() {
                return Err(anyhow!("Missing prop key."));
            }
            if prop_value.is_none() {
                return Err(anyhow!("Missing prop value."));
            }

            log::debug!("save java prop, filepath: {}, prop key: {:?}, prop value: {:?}", filepath, prop_key, prop_value);

            save_java_prop(&filepath, &prop_key.unwrap(), &prop_value.unwrap())?;

            Ok(None)
        }
    }
}

fn generate_stmts_results(stmt_list: Vec<&str>) -> Vec<ValidateResult> {
    let size = stmt_list.len();
    log::debug!("validating {} queries.", size);
    match PostgresProxy::validate_stmts(stmt_list) {
        Ok(mut validate_result) => validate_result
            .drain(..)
            .map(|vr| {
                if vr.pass {
                    return ValidateResult::new(Status::Pass, None);
                }

                let db_err = vr.error.as_ref().unwrap();
                let code_opt = db_err.get_code().as_ref();
                let mut status = Status::Warn;

                if let Some(code_str) = code_opt {
                    if SqlState::SYNTAX_ERROR.code() == code_str
                        || SqlState::SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION.code() == code_str
                    {
                        status = Status::Error;
                    }
                }

                ValidateResult::new(status, vr.error)
            })
            .collect(),
        Err(e) => vec![ValidateResult::new(Status::Warn, Some(SQLError::new(e.to_string()))); size],
    }
}
