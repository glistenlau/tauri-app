mod sql_common;
use anyhow::{anyhow, Error, Result};
use oracle::{Connection, Statement};
use sql_common::{SQLClient, SQLError, SQLReponse, SQLResult, SQLResultSet};
use std::time::Duration;

struct OracleConfig {
  host: String,
  port: String,
  sid: String,
  username: String,
  password: String,
}

pub struct OracleClient {
  config: Option<OracleConfig>,
}

static connect_string_pattern: &str = "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))";

impl OracleClient {
  fn get_connection(&self) -> Result<Connection> {
    match self.config {
      Some(cig) => {
        let connect_string: String = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", cig.host, cig.port, cig.sid);
        Ok(Connection::connect(
          cig.username,
          cig.password,
          connect_string,
        )?)
      }
      None => Err(anyhow!("There is not oracle config defined.")),
    }
  }

  fn execute_statement(&self, stmt_str: &str, params: &[&str]) -> Result<SQLResult> {
    let conn = self.get_connection()?;
    let prepared_stmt = conn.prepare(stmt_str, &[])?;

    if prepared_stmt.is_query() {
      let result_set = prepared_stmt.query(params)?;
      let row_count = prepared_stmt.row_count()?;
      
    } else {
      prepared_stmt.execute(params)?;
    }
  }

  fn generateErrorResponse(e: Error, elapsed: Duration) -> SQLReponse {
    SQLReponse {
      elapsed,
      success: false,
      result: SQLResult::Error(SQLError {
        message: String::from(e.description()),
      }),
    }
  }
}

impl sql_common::SQLClient for OracleClient {
  fn execute(&self, statement: &str, parameters: &[&str]) -> SQLReponse {
  }
}