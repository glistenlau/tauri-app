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
