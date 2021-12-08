use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::proxies::sql_common::{SQLClient, SQLResult};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    ExecuteStatement,
    SetAutocommit,
    Rollback,
    Commit,
    // SetConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    statement: Option<String>,
    schema: Option<String>,
    parameters: Option<Vec<Value>>,
    // config: Option<DBConfig>,
    autocommit: Option<bool>,
}

const COMPANY_PLACEHOLDER: &str = "company_";

pub fn handle_command(
    action: Action,
    payload: Payload,
    proxy: Arc<Mutex<dyn SQLClient>>,
) -> Result<SQLResult> {
    match action {
        Action::ExecuteStatement => {
            if payload.statement.is_none() {
                return Err(anyhow!("missing statement..."));
            }
            if payload.schema.is_none() {
                return Err(anyhow!("missing schema..."));
            }

            let schema = payload.schema.unwrap();
            let schema_str = format!("{}.", &schema);
            let mut statement = String::from(&payload.statement.unwrap());
            let mut statement_lower = statement.to_lowercase();
            loop {
                let str_index = statement_lower
                    .find(COMPANY_PLACEHOLDER)
                    .unwrap_or(statement_lower.len());
                if str_index == statement_lower.len() {
                    break;
                }

                statement.replace_range(
                    str_index..str_index + COMPANY_PLACEHOLDER.len(),
                    &schema_str,
                );
                statement_lower.replace_range(
                    str_index..str_index + COMPANY_PLACEHOLDER.len(),
                    &schema_str,
                );
            }

            let parameters = payload.parameters.unwrap_or(vec![]);

            log::debug!("dispatch sql execute statement: {}...", &statement);
            proxy
                .lock()
                .unwrap()
                .execute_stmt(&statement, &parameters, false)
        }
        // Action::SetConfig => {
        //     if payload.config.is_none() {
        //         return Err(anyhow!("missing config..."));
        //     }

        //     match proxy.lock().unwrap().set_config(payload.config.unwrap()) {
        //         Ok(sql_result) => match sql_result {
        //             SQLResult::Result(sr) => Ok(SQLResult::new_result(sr)),
        //             SQLResult::Error(err) => {
        //                 return Err(anyhow!(err.message()));
        //             }
        //             SQLResult::ResultWithStatistics {
        //                 result,
        //                 statistics: _,
        //             } => Ok(SQLResult::new_result(result)),
        //         },
        //         Err(err) => Err(err),
        //     }
        // }
        Action::SetAutocommit => {
            if payload.autocommit.is_none() {
                return Err(anyhow!("missing autocommit"));
            }
            proxy
                .lock()
                .unwrap()
                .set_autocommit(payload.autocommit.unwrap())
        }
        Action::Commit => proxy.lock().unwrap().commit(),
        Action::Rollback => proxy.lock().unwrap().rollback(),
    }
}
