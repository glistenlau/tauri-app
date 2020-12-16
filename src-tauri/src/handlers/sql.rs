use serde::{Deserialize, Serialize};
use serde_json::Value;
use anyhow::{anyhow, Result};
use crate::proxies::sql_common::{SQLClient, SQLResult};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
  ExecuteStatement,
  Rollback,
  Commit,
  SetConfig,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload<C> {
  statement: Option<String>,
  schema: Option<String>,
  parameters: Option<Vec<Value>>,
  config: Option<C>,
}

pub fn handle_command<C>(action: Action, payload: Payload<C>, proxy: Arc<Mutex<dyn SQLClient<C>>>) -> Result<SQLResult> {
  match action {
    Action::ExecuteStatement => {
      if payload.statement.is_none() {
        return Err(anyhow!("missing statement..."));
      }
      if payload.schema.is_none() {
        return Err(anyhow!("missing schema..."))
      }

      let statement = &payload.statement.unwrap().replace("COMPANY_", &format!(".{}", payload.schema.unwrap()));
      let parameters = payload.parameters.unwrap_or(vec![]);

      log::debug!("dispatch sql execute statement...");
      proxy.lock().unwrap().execute(statement, &parameters)
    },
    Action::SetConfig => {
      if payload.config.is_none() {
        return Err(anyhow!("missing config..."));
      }

      match proxy.lock().unwrap().set_config(payload.config.unwrap()) {
          Ok(sql_result) => {
            match sql_result {
                SQLResult::Result(sr) => Ok(SQLResult::new_result(sr)),
                SQLResult::Error(err) => {return Err(anyhow!(err.message()))}
            }
          }
          Err(err) => Err(err)
      }
    }
    _ => Err(anyhow!("The action is not supported."))
  }
}