use serde::{Deserialize, Serialize};
use anyhow::{anyhow, Result};
use crate::proxies::sql_common::{SQLClient, SQLReponse};
use crate::proxies::postgres;

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
  let proxy = postgres::get_proxy();
  match action {
    Action::ExecuteStatement => {
      let params: Vec<&str> = payload.parameters.iter().map(|p| &p[..]).collect();
      let params = &params[..];
      Ok(proxy.execute(&payload.statement, params))
    },
    _ => Err(anyhow!("The action is not supported."))
  }
}