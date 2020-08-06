use anyhow::Result;
use std::time::Duration;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SQLResultSet {
  row_count: u64,
  columns: Option<Vec<String>>,
  rows: Option<Vec<Vec<String>>>,
}

#[derive(Serialize, Deserialize)]
pub struct SQLError {
  message: String,
}

#[derive(Serialize, Deserialize)]
pub enum SQLResult {
  Result(SQLResultSet),
  Error(SQLError),
}

#[derive(Serialize, Deserialize)]
pub struct SQLReponse {
  success: bool,
  elapsed: Duration,
  result: SQLResult,
}

pub trait SQLClient {
  fn execute(&self, statement: &str, parameters: &[&str]) -> SQLReponse;
}