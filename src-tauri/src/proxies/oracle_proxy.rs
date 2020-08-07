use anyhow::{anyhow, Error, Result};
use oracle::{sql_type::ToSql, Connection, ResultSet, Row, Statement};
use super::sql_proxy::{SQLClient, SQLError, SQLReponse, SQLResult, SQLResultSet};
use std::time::{Duration, Instant};

struct OracleConfig<'a> {
  host: &'a str,
  port: &'a str,
  sid: &'a str,
  username: &'a str,
  password: &'a str,
}

pub struct OracleClient<'a> {
  config: Option<&'a OracleConfig<'a>>,
}

impl OracleClient<'_> {
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

  fn execute_statement(&self, stmt_str: &str, params: &[&dyn ToSql]) -> Result<SQLResultSet> {
    let conn = self.get_connection()?;
    let mut prepared_stmt = conn.prepare(stmt_str, &[])?;
    let res;

    if prepared_stmt.is_query() {
      let result_set = prepared_stmt.query(params)?;
      let mut row_count = 0;
      let mut columns: Vec<String> = Vec::new();
      let mut rows: Vec<Vec<String>> = Vec::with_capacity(row_count);

      for info in result_set.column_info() {
        columns.push(String::from(info.name()));
      }

      for row_result in result_set {
        row_count += 1;
        let row = row_result?;
        let row_str = row.sql_values().iter().map(|val| val.to_string()).collect();
        rows.push(row_str);
      }

      res = SQLResultSet::new(row_count, Some(columns), Some(rows));
    } else {
      let execute_stmt = conn.execute(stmt_str, params)?;
      let row_count = execute_stmt.row_count()? as usize;

      res = SQLResultSet::new(row_count, None, None);
    }

    Ok(res)
  }
}

impl SQLClient for OracleClient<'_> {
  fn execute(&self, statement: &str, parameters: &[&str]) -> SQLReponse {
    let now = Instant::now();
    let mut mapped_params = Vec::with_capacity(parameters.len());
    parameters
      .iter()
      .for_each(|p| mapped_params.push(p as &dyn ToSql));

    match self.execute_statement(statement, &mapped_params) {
      Ok(result_set) => SQLReponse::from(true, now.elapsed(), SQLResult::Result(result_set)),
      Err(e) => SQLReponse::from(
        false,
        now.elapsed(),
        SQLResult::Error(SQLError::from(e.to_string())),
      ),
    }
  }
}

static DEFAULT_CONFIG: OracleConfig = OracleConfig {
  host: "localhost", 
  port: "1521", 
  sid: "anaconda", 
  username: "anaconda", 
  password: "anaconda"
};

static INSTANCE: OracleClient = OracleClient{config: Some(& DEFAULT_CONFIG)};

pub fn get_proxy() -> &'static OracleClient<'static> {
  &INSTANCE
}
