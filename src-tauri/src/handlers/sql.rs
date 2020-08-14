use serde::{Deserialize, Serialize};
use serde_json::Value;
use anyhow::{anyhow, Result};
use crate::proxies::sql_common::{SQLClient, SQLReponse};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
  ExecuteStatement,
  Rollback,
  Commit,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
  statement: String,
  parameters: Vec<Value>,
}

pub fn handle_command(action: Action, payload: Payload, proxy: &dyn SQLClient) -> Result<SQLReponse> {
  match action {
    Action::ExecuteStatement => {
      Ok(proxy.execute(&payload.statement, &payload.parameters))
    },
    _ => Err(anyhow!("The action is not supported."))
  }
}