use super::{Endpoint, Response, ResponseError, ResponseResult};
use crate::proxies::java_props::load_props;
use crate::proxies::postgres::{PostgresProxy, get_proxy};
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::{sync::Arc, time::{Duration, Instant}};
use tokio_postgres::{Error, error::{SqlState, DbError}, Client};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Search,
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
        S: serde::Serializer {
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
  detail: Option<String>,
}

impl ValidateResult {
  pub fn new(status: Status, detail: Option<String>) -> ValidateResult {
    ValidateResult {
      status,
      detail,
    }
  }
}

#[derive(Clone, Serialize, Debug)]
pub struct ResponseBody {
  file_props_map: HashMap<String, HashMap<String, (Option<String>, Option<String>)>>,
  file_props_valid_map: HashMap<String, HashMap<String, ValidateResult>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    filepath: String,
    classname: String,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Result<ResponseBody> {
  let Endpoint { action, payload} = endpoint;
  let Payload {filepath, classname} = payload;

  match action {
    Action::Search => {
      let file_props_map = load_props(&filepath, &classname)?;

      let queries_to_validate: HashMap<String, HashMap<String, ValidateResult>> = file_props_map.iter().map(|(fk, fv)| {
          let mut query_validate_map = HashMap::with_capacity(fv.len());
          let param_stmt_list: Vec<(String, String)> = fv.iter().map(|(pk, pv)| {
            let stmt = match pv {
              (_, Some(pg)) => pg,
              (Some(ora), _) => ora,
              _ => "",
            };

            (String::from(pk), String::from(stmt))
          })
          .filter(|(pk, _)| !pk.to_lowercase().ends_with(".md5"))
          .collect();

          let stmt_list: Vec<&str> = param_stmt_list.iter().map(|(_, query)| query.as_str()).collect();
          let size = stmt_list.len();
          let mut validate_results: Vec<ValidateResult> = generate_stmts_results(stmt_list);
          for (i, validate_result) in validate_results.drain(..).enumerate() {
            let (param, _) = param_stmt_list.get(i).unwrap(); 

            query_validate_map.insert(String::from(param), validate_result);
          }
          
          (String::from(fk), query_validate_map)
      }).collect();

      Ok(ResponseBody {
        file_props_map: file_props_map,
        file_props_valid_map: queries_to_validate,
      })
    }
  }
}

fn generate_stmts_results(stmt_list: Vec<&str>) -> Vec<ValidateResult> {
  let size = stmt_list.len();
  match PostgresProxy::validate_stmts(stmt_list) {
    Ok(validate_result) => validate_result.iter().map(|vr| {
      if vr.pass {
        return ValidateResult::new(Status::Pass, None);
      }

      let db_err = vr.error.as_ref().unwrap();
      let (code, detail) = (db_err.code(), db_err.message());

      if code == &SqlState::SYNTAX_ERROR || code == &SqlState::SYNTAX_ERROR_OR_ACCESS_RULE_VIOLATION {
        ValidateResult::new(Status::Error, Some(String::from(detail)))
      } else {
        ValidateResult::new(Status::Warn, Some(String::from(detail)))
      }
    }).collect(),
    Err(e) => vec![ValidateResult::new(Status::Warn, Some(e.to_string())); size]
  }
}
