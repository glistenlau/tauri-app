use serde::{Deserialize, Serialize};
use anyhow::{anyhow, Result};
use crate::proxies::sql_proxy::{SQLClient, SQLReponse};
use crate::proxies::oracle_proxy;

#[derive(Serialize, Deserialize)]
pub enum Action {
  ExecuteStatement,
  Rollback,
  Commit,
}

#[derive(Serialize, Deserialize)]
pub struct Payload {
  statement: String,
  parameters: Vec<String>,
}

pub fn handle_command(action: Action, payload: Payload) -> Result<SQLReponse> {
  let oracle_client = oracle_proxy::get_proxy();
  match action {
    Action::ExecuteStatement => {
      let params: Vec<&str> = payload.parameters.iter().map(|p| &p[..]).collect();
      let params = &params[..];
      Ok(oracle_client.execute(&payload.statement, params))
    },
    _ => Err(anyhow!("The action is not supported."))
  }
}