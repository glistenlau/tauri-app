use std::sync::{Arc, Mutex};

use anyhow::Result;
use lazy_static::lazy_static;
use oracle::{sql_type::ToSql, Connection};
use oracle::{ColumnInfo, Statement};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

use crate::{core::oracle_param_mapper::map_params, utilities::oracle::get_row_values};

use super::sql_common::{SQLClient, SQLError, SQLResult, SQLResultSet};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct OracleConfig {
    host: String,
    port: String,
    sid: String,
    user: String,
    password: String,
}

impl OracleConfig {
    fn new(host: &str, port: &str, sid: &str, user: &str, password: &str) -> OracleConfig {
        OracleConfig {
            host: String::from(host),
            port: String::from(port),
            sid: String::from(sid),
            user: String::from(user),
            password: String::from(password),
        }
    }
}

pub struct OracleClient {
    config: OracleConfig,
    conn: Option<Arc<Mutex<Connection>>>,
    autocommit: bool,
}

impl OracleClient {
    fn set_config(&mut self, config: OracleConfig) {
        self.config = config;
    }

    pub fn get_connection(&mut self) -> Result<Arc<Mutex<Connection>>, SQLError> {
        if self.conn.is_none() || self.conn.as_ref().unwrap().lock().unwrap().ping().is_err() {
            log::debug!(
                "try to obtain a new oracle connection, conn was present: {}",
                self.conn.is_some()
            );
            self.conn = Some(Arc::new(Mutex::new(self.connect()?)));
        }

        Ok(Arc::clone(self.conn.as_ref().unwrap()))
    }

    fn connect(&self) -> Result<Connection, SQLError> {
        let connect_string: String = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", self.config.host, self.config.port, self.config.sid);
        Ok(Connection::connect(
            &self.config.user,
            &self.config.password,
            connect_string,
        )?)
    }

    pub fn execute_stmt_with_statistics(
        stmt: &str,
        params: &[Value],
        conn: &Connection,
    ) -> Result<SQLResult, SQLError> {
        let gather_plan_statistics_hint = format!(
            " /*+ gather_plan_statistics {} */ ",
            Uuid::new_v4().to_string()
        );
        let stmt_lower = stmt.to_lowercase();

        let key_str = {
            let statement = conn.statement(stmt).build()?;

            match statement.statement_type() {
                oracle::StatementType::Select => "select",
                oracle::StatementType::Insert => "insert",
                oracle::StatementType::Update => "update",
                oracle::StatementType::Delete => "delete",
                oracle::StatementType::Merge => "merge",
                _ => return Err(SQLError::new_str("Can't explain the statement.")),
            }
        };
        let insert_pos = stmt_lower
            .find(key_str)
            .and_then(|pos| Some(pos + key_str.len()))
            .unwrap();
        let mut new_statement = stmt.to_owned();
        new_statement.insert_str(insert_pos, &gather_plan_statistics_hint);

        let res = Self::execute_stmt(&new_statement, params, conn)?;
        let statistics_res = Self::retrieve_statistics(&new_statement, conn);

        Ok(match statistics_res {
            Ok(res_set) => SQLResult::new_result_with_statistics(Some(res), Some(res_set)),
            Err(_e) => {
                SQLResult::new_result_with_statistics(Some(res), Option::<SQLResultSet>::None)
            }
        })
    }

    fn retrieve_statistics(stmt: &str, conn: &Connection) -> Result<SQLResultSet, SQLError> {
        let sql_id_stmt = format!("SELECT sql_id FROM V$SQL WHERE sql_text = '{}'", stmt);
        let sql_id_res = Self::execute_stmt(&sql_id_stmt, &Vec::new(), conn)?;

        let sql_id = match sql_id_res.get_rows() {
            Some(rows) => {
                if rows.is_empty() || rows[0].is_empty() {
                    return Err(SQLError::new_str("Can't find the sql statement."));
                }
                rows[0][0].to_owned()
            }
            None => return Err(SQLError::new_str("Can't find the sql statement.")),
        };

        let statistics_stmt = "SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(?,0,'ALLSTATS LAST'))";
        Self::execute_stmt(statistics_stmt, &vec![sql_id], conn)
    }

    pub fn execute_stmt(
        stmt: &str,
        params: &[Value],
        conn: &Connection,
    ) -> Result<SQLResultSet, SQLError> {
        let mapped_params = map_params(Some(stmt), params, conn)?;
        let mut unboxed_params = Vec::with_capacity(mapped_params.len());
        for b in &mapped_params {
            unboxed_params.push(b.as_ref());
        }

        if mapped_params.len() > 0 {
            let mut replaced_stmt = String::with_capacity(stmt.len());
            let (mut stmt_parts, mut i) = (stmt.split("?"), 1);

            replaced_stmt.push_str(stmt_parts.next().unwrap());
            for part in stmt_parts {
                replaced_stmt.push_str(&format!(":{}", i));
                replaced_stmt.push_str(part);
                i += 1;
            }
            Self::execute_stmt_mapped(&replaced_stmt, &unboxed_params, conn)
        } else {
            Self::execute_stmt_mapped(stmt, &unboxed_params, conn)
        }
    }

    pub fn execute_stmt_mapped(
        stmt_str: &str,
        params: &[&dyn ToSql],
        conn: &Connection,
    ) -> Result<SQLResultSet, SQLError> {
        log::debug!("execute oracle statement: {}", stmt_str);
        let mut prepared_stmt = conn.prepare(stmt_str, &[])?;

        Self::execute_prepared(&mut prepared_stmt, params)
    }

    pub fn execute_prepared(
        stmt: &mut Statement,
        params: &[&dyn ToSql],
    ) -> Result<SQLResultSet, SQLError> {
        let res = if stmt.is_query() {
            let mut result_set = stmt.query(params)?;
            let mut row_count = 0;
            let column_info: Vec<ColumnInfo> = result_set
                .column_info()
                .iter()
                .map(|ci| ci.clone())
                .collect();
            let mut columns: Vec<String> = Vec::new();
            let mut rows: Vec<Vec<Value>> = Vec::with_capacity(row_count);

            for info in &column_info {
                columns.push(String::from(info.name()));
            }

            for row_result in result_set.by_ref() {
                row_count += 1;
                let row = row_result?;
                let row_values = get_row_values(&row, &column_info)?;
                rows.push(row_values);
            }

            SQLResultSet::new(row_count, Some(columns), Some(rows))
        } else {
            stmt.execute(params)?;
            let row_count = stmt.row_count()? as usize;

            SQLResultSet::new(row_count, None, None)
        };

        Ok(res)
    }
}

impl SQLClient<OracleConfig> for OracleClient {
    fn set_config(&mut self, config: OracleConfig) -> Result<SQLResult> {
        self.set_config(config);
        self.conn = None;
        match self.get_connection() {
            Ok(_) => Ok(SQLResult::new_result(None)),
            Err(e) => Ok(SQLResult::new_error(e)),
        }
    }

    fn set_autocommit(&mut self, autocommit: bool) -> Result<SQLResult> {
        if self.autocommit == autocommit {
            log::warn!(
                "Try to set Oracle autocommit to the same value: {}",
                autocommit
            );
            return Ok(SQLResult::Result(None));
        }

        log::debug!("Set oracle autocommit: {}", autocommit);
        self.autocommit = autocommit;
        if let Some(conn_lock) = &self.conn {
            let mut conn = conn_lock.lock().unwrap();
            conn.set_autocommit(autocommit);
            if autocommit {
                conn.commit()?;
            }
        }

        Ok(SQLResult::Result(None))
    }

    fn commit(&mut self) -> Result<SQLResult> {
        if let Some(conn_lock) = &self.conn {
            let conn = conn_lock.lock().unwrap();
            conn.commit()?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn rollback(&mut self) -> Result<SQLResult> {
        if let Some(conn_lock) = &self.conn {
            let conn = conn_lock.lock().unwrap();
            conn.rollback()?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn add_savepoint(&mut self, savepoint: &str) -> Result<SQLResult> {
        if self.autocommit {
            return Ok(SQLResult::new_error(SQLError::new(
                "Can't add savepoint when autocommit on.".to_string(),
            )));
        }
        if let Some(conn_lock) = &self.conn {
            let conn = conn_lock.lock().unwrap();
            conn.execute(&format!("SAVEPOINT {}", savepoint), &[])?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn rollback_to_savepoint(&mut self, savepoint: &str) -> Result<SQLResult> {
        if let Some(conn_lock) = &self.conn {
            let conn = conn_lock.lock().unwrap();
            conn.execute(&format!("ROLLBACK TO {}", savepoint), &[])?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn execute_stmt(
        &mut self,
        statement: &str,
        parameters: &[Value],
        with_statistics: bool,
    ) -> Result<SQLResult> {
        let conn = self.get_connection()?;
        let conn_lock = conn.lock().unwrap();

        let exec_res = if with_statistics {
            Self::execute_stmt_with_statistics(statement, parameters, &conn_lock)
        } else {
            let res = Self::execute_stmt(statement, parameters, &conn_lock);
            res.map(|rs| SQLResult::new_result(Some(rs)))
        };

        exec_res.or_else(|e| Ok(SQLResult::new_error(e)))
    }
}

lazy_static! {
    static ref INSTANCE: Arc<Mutex<OracleClient>> = Arc::new(Mutex::new(OracleClient {
        config: OracleConfig::new("localhost", "1521", "anaconda", "anaconda", "anaconda"),
        conn: None,
        autocommit: true,
    }));
}

pub fn get_proxy() -> Arc<Mutex<OracleClient>> {
    Arc::clone(&INSTANCE)
}

pub fn get_conn() -> Arc<Mutex<Connection>> {
    let proxy = get_proxy();
    let mut proxy_lock = proxy.lock().unwrap();
    proxy_lock.get_connection().unwrap()
}
