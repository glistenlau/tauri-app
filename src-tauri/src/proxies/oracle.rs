use super::sql_common::{SQLClient, SQLError, SQLReponse, SQLResult, SQLResultSet};
use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use oracle::{sql_type::ToSql, Connection};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    sync::{Arc, Mutex},
    time::Instant,
};

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
}

impl OracleClient {
    fn set_config(&mut self, config: OracleConfig) {
        self.config = config;
    }

    pub fn get_connection(&mut self) -> Result<Arc<Mutex<Connection>>> {
        if self.conn.is_none() || self.conn.as_ref().unwrap().lock().unwrap().ping().is_err() {
            log::debug!(
                "try to obtain a new oracle connection, conn was present: {}",
                self.conn.is_some()
            );
            self.conn = Some(Arc::new(Mutex::new(self.connect()?)));
        }

        Ok(Arc::clone(self.conn.as_ref().unwrap()))
    }

    fn connect(&self) -> Result<Connection> {
        let connect_string: String = format!("(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={})(PORT={}))(CONNECT_DATA=(SERVER=DEDICATED)(SID={})))", self.config.host, self.config.port, self.config.sid);
        Ok(Connection::connect(
            &self.config.user,
            &self.config.password,
            connect_string,
        )?)
    }

    fn execute_stmt(&mut self, stmt: &str, params: &[Value]) -> Result<SQLResultSet> {
        let conn_wrap = self.get_connection()?;
        let conn = conn_wrap.lock().unwrap();
        let mapped_params = self.map_params(Some(stmt), params, &conn)?;
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
            self.execute_stmt_mapped(
                &replaced_stmt,
                &unboxed_params,
                &conn,
            )
        } else {
            self.execute_stmt_mapped(stmt, &unboxed_params, &conn)
        }
    }

    fn execute_stmt_mapped(
        &self,
        stmt_str: &str,
        params: &[&dyn ToSql],
        conn: &Connection,
    ) -> Result<SQLResultSet> {
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

    fn map_params(
        &self,
        statement: Option<&str>,
        parameters: &[Value],
        conn: &Connection,
    ) -> Result<Vec<Box<dyn ToSql>>> {
        let mut mapped_params = Vec::with_capacity(parameters.len());
        let params_iter = parameters.iter().enumerate();
        let mut mapped_param;

        for (index, param) in params_iter {
            mapped_param = self.map_param(statement, Some(index), param, conn)?;
            mapped_params.push(mapped_param);
        }

        Ok(mapped_params)
    }

    fn map_param(
        &self,
        statement: Option<&str>,
        pos: Option<usize>,
        param: &Value,
        conn: &Connection,
    ) -> Result<Box<dyn ToSql>> {
        println!("map param {}", param);
        let parsed_val = match param {
            Value::Number(val) => {
                if val.is_f64() {
                    Box::new(val.as_f64().unwrap()) as Box<dyn ToSql>
                } else if val.is_u64() {
                    Box::new(val.as_u64().unwrap()) as Box<dyn ToSql>
                } else {
                    Box::new(val.as_i64().unwrap()) as Box<dyn ToSql>
                }
            }
            Value::Null => Box::new(Option::<String>::None) as Box<dyn ToSql>,
            Value::Bool(val) => Box::new(*val) as Box<dyn ToSql>,
            Value::String(val) => Box::new(val.to_string()) as Box<dyn ToSql>,
            Value::Array(arr) => {
                println!("map array {:?}", &arr);
                let collection_name = extract_collection_name(statement, pos)?;
                let collection_type = conn.object_type(&collection_name)?;
                let mut collection = collection_type.new_collection()?;
                let mapped_arr = self.map_params(None, &arr, conn)?;

                for val in mapped_arr {
                    if let Err(e) = collection.push(val.as_ref()) {
                        return Err(anyhow!(
                            "failed to push data into collection for paramter: {}",
                            e
                        ));
                    }
                }

                Box::new(collection) as Box<dyn ToSql>
            }
            Value::Object(_) => return Err(anyhow!("not support object param for oracle.")),
        };

        Ok(parsed_val)
    }
}

fn extract_collection_name(stmt: Option<&str>, pos: Option<usize>) -> Result<String> {
    if None == stmt || None == pos {
        return Err(anyhow!(
            "missing info to retrieve name of the collection type."
        ));
    }

    let (stmt, pos) = (stmt.unwrap(), pos.unwrap());

    let mut pattern = String::from(START_PATTERN);
    if pos > 0 {
        pattern.push_str(PARAM_PATTERN);
        pattern.push_str(&format!("{{{}}}", pos));
    }

    pattern.push_str(COLLECTION_PATTERN);
    println!("collection regex pattern: {}", &pattern);
    let re = match Regex::new(&pattern) {
        Ok(r) => r,
        Err(e) => return Err(anyhow!("collection regex pattern error: {}", e)),
    };

    if let Some(cap) = re.captures(stmt) {
        return Ok(String::from(&cap[1]));
    }
    Err(anyhow!("No collection found for parameter {}", pos))
}

static COLLECTION_PATTERN: &str = r"[^?]*CAST\s*\(\s*\?\s*AS\s*(.*)\s*\)";
static PARAM_PATTERN: &str = r"(?:[^?]*\?[^?]*)";
static START_PATTERN: &str = r"(?i)^\s*";

impl SQLClient<OracleConfig> for OracleClient {
    fn execute(&mut self, statement: &str, parameters: &[Value]) -> Result<SQLResult> {
        log::debug!("execute oracle statement {}, parameters {:?}", statement, parameters);
        let result_set = self.execute_stmt(statement, parameters)?;
        Ok(SQLResult::new_result(Some(result_set)))
    }

    fn set_config(&mut self, config: OracleConfig) -> Result<SQLResult> {
        self.config = config;
        self.get_connection()?;
        Ok(SQLResult::new_result(None))
    }
}

lazy_static! {
    static ref INSTANCE: Arc<Mutex<OracleClient>> = Arc::new(Mutex::new(OracleClient {
        config: OracleConfig::new("localhost", "1521", "anaconda", "anaconda", "anaconda"),
        conn: None,
    }));
}

pub fn get_proxy() -> Arc<Mutex<OracleClient>> {
    Arc::clone(&INSTANCE)
}
