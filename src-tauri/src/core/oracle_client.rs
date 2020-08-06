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

pub struct OracleClient<'a> {
  config: &'a Option<OracleConfig>,
}

impl OracleClient {
  fn new(config: &Option<OracleConfig>) -> OracleClient {
    OracleClient {
      config
    }
  }
  
  fn get_connection(&self) -> Result<Connection> {
    match self.config {
      Some(cig) => {
        let connect_string: String = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", cig.host, cig.port, cig.sid);
        Ok(Connection::connect(
          &cig.username,
          &cig.password,
          connect_string,
        )?)
      }
      None => Err(anyhow!("There is not oracle config defined.")),
    }
  }

  fn execute_statement(&self, stmt_str: &str, params: &[&str]) -> Result<SQLResultSet> {
    let conn = self.get_connection()?;
    let mut prepared_stmt = conn.prepare(stmt_str, &[])?;

    if prepared_stmt.is_query() {
      let result_set = prepared_stmt.query(params)?;
      let row_count = prepared_stmt.row_count()?;
      let mut columns: Vec<String> = Vec::new();
      let mut rows: Vec<Vec<String>> = Vec::with_capacity(row_count.into());
      
      let res;
      for info in result_set.column_info() {
        columns.push(String::from(info.name()));
      }
      
      for row_result in result_set {
        let row = row_result?;
        let row_str = row.get_as::<Vec<String>>()?;
        rows.push(row_str);
      }
      res = SQLResultSet {
        columns: Some(columns),
        row_count,
        rows: Some(rows),
      };
    } else {
      prepared_stmt.execute(params)?;
      let row_count = prepared_stmt.row_count()?;
      res = SQLResultSet {
        columns: None,
        row_count,
        rows: None,
      };
    }
    
    Ok(res)
  }

  fn get_error_res(e: Error, elapsed: Duration) -> SQLReponse {
    SQLReponse {
      elapsed,
      success: false,
      result: SQLResult::Error(SQLError {
        message: String::from(e.to_string()),
      }),
    }
  }
}

impl sql_common::SQLClient for OracleClient {
  fn execute(&self, statement: &str, parameters: &[&str]) -> SQLReponse {
    match self.execute_statement(statement, parameters) {
      Ok(result_set) => 
    }
  }
}