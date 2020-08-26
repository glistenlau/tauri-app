use anyhow::Result;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
pub struct SQLResultSet {
  row_count: usize,
  columns: Option<Vec<String>>,
  rows: Option<Vec<Vec<String>>>,
}

impl SQLResultSet {
  pub fn new(row_count: usize, columns: Option<Vec<String>>, rows: Option<Vec<Vec<String>>>) -> SQLResultSet {
    SQLResultSet {
      row_count,
      columns,
      rows,
    }
  }
}

#[derive(Serialize, Deserialize)]
pub struct SQLError {
  message: String,
}

impl SQLError {
  pub fn from(message: String) -> SQLError {
    SQLError {
      message
    }
  }
}

#[derive(Serialize, Deserialize)]
pub enum SQLResult {
  Result(Option<SQLResultSet>),
  Error(SQLError),
}

impl SQLResult {
  pub fn new_result(result:Option<SQLResultSet>) -> SQLResult {
    SQLResult::Result(result)
  }

  pub fn new_error(error: SQLError) -> SQLResult {
    SQLResult::Error(error)
  }
}

#[derive(Serialize, Deserialize)]
pub struct SQLReponse {
  success: bool,
  elapsed: Duration,
  result: Option<SQLResult>,
}

impl SQLReponse {
  pub fn new(success: bool, elapsed: Duration, result: SQLResult) -> SQLReponse {
    SQLReponse {
      success,
      elapsed,
      result: Some(result),
    }
  }
}

pub trait SQLClient<C> {
  fn execute(&self, statement: &str, parameters: &[Value]) -> Result<SQLResult>;
  fn set_config(&mut self, config:C) -> Result<SQLResult>;
}