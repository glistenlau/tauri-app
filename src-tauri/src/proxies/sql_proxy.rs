use anyhow::Result;
use std::time::Duration;
use serde::{Deserialize, Serialize};

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
  Result(SQLResultSet),
  Error(SQLError),
}

#[derive(Serialize, Deserialize)]
pub struct SQLReponse {
  success: bool,
  elapsed: Duration,
  result: SQLResult,
}

impl SQLReponse {
  pub fn from(success: bool, elapsed: Duration, result: SQLResult) -> SQLReponse {
    SQLReponse {
      success,
      elapsed,
      result
    }
  }
}

pub trait SQLClient {
  fn execute(&self, statement: &str, parameters: &[&str]) -> SQLReponse;
}