use std::sync::{Arc, Mutex, MutexGuard};

use anyhow::Result;
use lazy_static::lazy_static;
use oracle::{sql_type::ToSql, Connection};
use oracle::{ColumnInfo, Statement, StmtParam};

use serde_json::Value;
use uuid::Uuid;

use crate::{core::oracle_param_mapper::map_params, utilities::oracle::get_row_values};

use super::sql_common::{
    generate_param_stmt, Config, ConsoleManager, SQLClient, SQLError, SQLResult, SQLResultSet,
};

impl ConsoleManager<Connection> {
    pub fn get_console_conn(&mut self) -> Result<&Connection, SQLError> {
        if self.console_client.is_none() || self.console_client.as_ref().unwrap().ping().is_err() {
            log::debug!("try to obtain a new oracle console connection, is the connection present: {}, thread id: {:?}", self.console_client.is_some(), std::thread::current().id());

            let conn_res = OracleClient::connect(&self.config)?;

            self.console_client = Some(conn_res);
        }
        Ok(self.console_client.as_ref().unwrap())
    }
}

pub struct OracleClient(Arc<Mutex<ConsoleManager<Connection>>>);

static PARAM_SIGN: &str = ":";

impl OracleClient {
    fn new(config: Config) -> Self {
        Self(Arc::new(Mutex::new(ConsoleManager {
            config: config,
            console_client: None,
            autocommit: false,
        })))
    }

    pub fn get_console_manager(&self) -> Result<MutexGuard<'_, ConsoleManager<Connection>>> {
        Ok(self.0.lock().unwrap())
    }

    fn connect(config: &Config) -> Result<Connection, SQLError> {
        let connect_string: String = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", config.host, config.port, config.db);
        Ok(Connection::connect(
            &config.username,
            &config.password,
            connect_string,
        )?)
    }

    pub fn validate_stmt(stmt: &str, conn: &Connection) -> SQLResult {
        let param_stmt = generate_param_stmt(stmt, PARAM_SIGN);
        match conn.statement(&param_stmt).build() {
            Ok(_) => SQLResult::new_result(None),
            Err(e) => SQLResult::new_error(SQLError::from(e)),
        }
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
        let sql_id_stmt = format!(
            "SELECT sql_id, child_number FROM V$SQL WHERE sql_text = '{}'",
            stmt
        );
        let sql_id_res = Self::execute_stmt(&sql_id_stmt, &Vec::new(), conn)?;

        let (sql_id, child_number) = match sql_id_res.get_rows() {
            Some(rows) => {
                if rows.is_empty() || rows[0].is_empty() {
                    return Err(SQLError::new_str("Can't find the sql statement."));
                }
                (rows[0][0].to_owned(), rows[0][1].to_owned())
            }
            None => return Err(SQLError::new_str("Can't find the sql statement.")),
        };

        let statistics_stmt = "SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(?,?,'ALLSTATS LAST'))";
        Self::execute_stmt(statistics_stmt, &vec![sql_id, child_number], conn)
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
            let replaced_stmt = generate_param_stmt(stmt, PARAM_SIGN);
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
        let mut prepared_stmt = conn.prepare(stmt_str, &[StmtParam::FetchArraySize(100000)])?;

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

impl SQLClient for OracleClient {
    fn set_config(&'static self, db_config: Config) -> Result<SQLResult> {
        let mut console_manager = self.get_console_manager()?;
        console_manager.config = db_config;
        console_manager.console_client = None;

        match Self::connect(&console_manager.config) {
            Ok(_) => Ok(SQLResult::new_result(None)),
            Err(e) => Ok(SQLResult::new_error(e)),
        }
    }

    fn set_autocommit(&'static self, autocommit: bool) -> Result<SQLResult> {
        let mut manager = self.get_console_manager()?;
        if manager.autocommit == autocommit {
            log::warn!(
                "Try to set Oracle autocommit to the same value: {}",
                autocommit
            );
            return Ok(SQLResult::Result(None));
        }

        log::debug!("Set oracle autocommit: {}", autocommit);
        manager.autocommit = autocommit;
        if let Some(conn) = manager.console_client.as_mut() {
            conn.set_autocommit(autocommit);
            if autocommit {
                conn.commit()?;
            }
        }

        Ok(SQLResult::Result(None))
    }

    fn commit_console(&'static self) -> Result<SQLResult> {
        let manager = self.get_console_manager()?;
        if let Some(conn) = manager.console_client.as_ref() {
            conn.commit()?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn rollback_console(&'static self) -> Result<SQLResult> {
        let manager = self.get_console_manager()?;

        if let Some(conn) = manager.console_client.as_ref() {
            conn.rollback()?;
        }

        Ok(SQLResult::new_result(None))
    }

    fn add_savepoint(&'static self, _savepoint: &str) -> Result<SQLResult> {
        todo!()
        // if self.autocommit {
        //     return Ok(SQLResult::new_error(SQLError::new(
        //         "Can't add savepoint when autocommit on.".to_string(),
        //     )));
        // }
        // if let Some(conn_lock) = &self.conn {
        //     let conn = conn_lock.lock().unwrap();
        //     conn.execute(&format!("SAVEPOINT {}", savepoint), &[])?;
        // }

        // Ok(SQLResult::new_result(None))
    }

    fn rollback_to_savepoint(&'static self, _savepoint: &str) -> Result<SQLResult> {
        todo!()
        // if let Some(conn_lock) = &self.conn {
        //     let conn = conn_lock.lock().unwrap();
        //     conn.execute(&format!("ROLLBACK TO {}", savepoint), &[])?;
        // }

        // Ok(SQLResult::new_result(None))
    }

    fn execute_stmt(
        &self,
        statement: &str,
        parameters: &[Value],
        with_statistics: bool,
    ) -> Result<SQLResult> {
        let mut manager = self.get_console_manager()?;
        let conn = manager.get_console_conn()?;

        let exec_res = if with_statistics {
            Self::execute_stmt_with_statistics(statement, parameters, conn)
        } else {
            let res = Self::execute_stmt(statement, parameters, conn);
            res.map(|rs| SQLResult::new_result(Some(rs)))
        };

        exec_res.or_else(|e| Ok(SQLResult::new_error(e)))
    }

    fn validate_stmts(&'static self, stmts: &[&str]) -> Result<Vec<SQLResult>> {
        let console_manager = self.get_console_manager()?;
        let conn = Self::connect(&console_manager.config)?;

        let res = stmts
            .iter()
            .map(|&stmt| Self::validate_stmt(stmt, &conn))
            .collect();

        Ok(res)
    }
}

lazy_static! {
    static ref INSTANCE: OracleClient = OracleClient::new(Config::new(
        "localhost",
        "1521",
        "anaconda",
        "anaconda",
        "anaconda"
    ));
}

pub fn get_proxy() -> &'static OracleClient {
    &*INSTANCE
}
