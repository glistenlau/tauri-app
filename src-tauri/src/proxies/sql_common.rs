use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::{cmp, error::Error, fmt};

use anyhow::Result;

use async_graphql::Enum;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::utilities::find_position_line;

use super::postgres::PostgresProxy;

const COMPANY_PLACEHOLDER: &str = "company_";

pub fn process_statement_schema(statement: &str, schema: &str) -> String {
    let mut stmt = String::from(statement);
    let mut stmt_lower = statement.to_lowercase();
    loop {
        let str_index = stmt_lower
            .find(COMPANY_PLACEHOLDER)
            .unwrap_or(stmt_lower.len());
        if str_index == stmt_lower.len() {
            break;
        }

        stmt.replace_range(
            str_index..str_index + COMPANY_PLACEHOLDER.len(),
            &format!("{}.", schema),
        );
        stmt_lower.replace_range(
            str_index..str_index + COMPANY_PLACEHOLDER.len(),
            &format!("{}.", schema),
        );
    }

    stmt
}

pub fn process_statement_params(statement: &str, param_sign: &str) -> String {
    let mut new_stmt = String::with_capacity(statement.len());
    let split = statement.split("?");
    for (idx, part) in split.enumerate() {
        if idx != 0 {
            new_stmt.push_str(&format!("{}{}", param_sign, idx));
        }
        new_stmt.push_str(part);
    }

    new_stmt
}

#[derive(Enum, Serialize, Deserialize, Debug, Copy, Eq, PartialEq, Clone)]
#[serde(rename_all = "camelCase")]
pub enum DBType {
    Oracle,
    Postgres,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SQLResultSet {
    row_count: usize,
    columns: Option<Vec<String>>,
    rows: Option<Vec<Vec<Value>>>,
}

impl SQLResultSet {
    pub fn new(
        row_count: usize,
        columns: Option<Vec<String>>,
        rows: Option<Vec<Vec<Value>>>,
    ) -> SQLResultSet {
        SQLResultSet {
            row_count,
            columns,
            rows,
        }
    }

    pub fn sort_rows(&mut self) -> () {
        match self.rows.as_mut() {
            Some(row_vec) => {
                row_vec.sort_by(|a, b| {
                    let max_len = cmp::max(a.len(), b.len());
                    let order = cmp::Ordering::Equal;
                    for i in 0..max_len {
                        let a_cell = a.get(i);
                        let b_cell = b.get(i);
                        if a_cell.is_none() && b_cell.is_none() {
                            return cmp::Ordering::Equal;
                        } else if a_cell.is_none() {
                            return cmp::Ordering::Less;
                        } else if b_cell.is_none() {
                            return cmp::Ordering::Greater;
                        } else {
                            let cell_rst = a_cell
                                .unwrap()
                                .to_string()
                                .cmp(&b_cell.unwrap().to_string());
                            if cell_rst != cmp::Ordering::Equal {
                                return cell_rst;
                            }
                        }
                    }

                    order
                });
            }

            None => {}
        }
    }

    pub fn get_rows(&self) -> &Option<Vec<Vec<Value>>> {
        &self.rows
    }
}

#[derive(Clone, Serialize, Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum QueryErrorPoisition {
    Original {
        position: u32,
        line: u32,
    },
    Internal {
        position: u32,
        query: String,
        line: u32,
    },
}

impl From<&tokio_postgres::error::ErrorPosition> for QueryErrorPoisition {
    fn from(err: &tokio_postgres::error::ErrorPosition) -> Self {
        match err {
            tokio_postgres::error::ErrorPosition::Original(position) => {
                QueryErrorPoisition::Original {
                    position: *position,
                    line: 0,
                }
            }
            tokio_postgres::error::ErrorPosition::Internal { position, query } => {
                QueryErrorPoisition::Internal {
                    position: *position,
                    query: String::from(query),
                    line: 0,
                }
            }
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SQLError {
    action: Option<String>,
    code: Option<String>,
    column: Option<String>,
    constraint: Option<String>,
    data_type: Option<String>,
    detail: Option<String>,
    file: Option<String>,
    fn_name: Option<String>,
    hint: Option<String>,
    line: Option<u32>,
    message: String,
    offset: Option<u32>,
    position: Option<QueryErrorPoisition>,
    routine: Option<String>,
    schema: Option<String>,
    severity: Option<String>,
    table: Option<String>,
    #[serde(rename = "where")]
    where_: Option<String>,
}

impl fmt::Display for SQLError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SQL Error {}", &self.message)
    }
}

impl Error for SQLError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        None
    }
}

impl SQLError {
    pub fn new(message: String) -> SQLError {
        SQLError {
            message,
            ..Default::default()
        }
    }

    pub fn new_str(message: &str) -> Self {
        SQLError {
            message: String::from(message),
            ..Default::default()
        }
    }

    pub fn new_postgres_error(error: tokio_postgres::Error, statement: &str) -> Self {
        let mut instance = SQLError::from(error);
        match instance.position {
            Some(QueryErrorPoisition::Original { position, line: _ }) => {
                if !statement.is_empty() {
                    let position_line = find_position_line(statement, position);
                    instance.position = Some(QueryErrorPoisition::Original {
                        position,
                        line: position_line,
                    });
                }
            }
            Some(QueryErrorPoisition::Internal {
                position,
                query,
                line: _,
            }) => {
                let position_line = find_position_line(&query, position);
                instance.position = Some(QueryErrorPoisition::Internal {
                    position,
                    query,
                    line: position_line,
                })
            }
            None => {}
        };
        instance
    }

    pub fn get_code(&self) -> &Option<String> {
        &self.code
    }

    pub fn message(&self) -> String {
        self.message.clone()
    }
}

impl From<anyhow::Error> for SQLError {
    fn from(error: anyhow::Error) -> Self {
        SQLError {
            message: error.to_string(),
            ..Default::default()
        }
    }
}

impl From<oracle::Error> for SQLError {
    fn from(error: oracle::Error) -> Self {
        match error {
            oracle::Error::OciError(e) | oracle::Error::DpiError(e) => {
                let message = String::from(e.message());
                let action = if e.action().is_empty() {
                    None
                } else {
                    Some(String::from(e.action()))
                };
                let code = if e.code() == 0 {
                    None
                } else {
                    Some(e.code().to_string())
                };
                let fn_name = if e.fn_name().is_empty() {
                    None
                } else {
                    Some(String::from(e.fn_name()))
                };
                let offset = if e.offset() == 0 {
                    None
                } else {
                    Some(e.offset())
                };

                SQLError {
                    message,
                    action,
                    code,
                    fn_name,
                    offset,
                    ..Default::default()
                }
            }
            _ => SQLError::new(error.to_string()),
        }
    }
}

fn opt_str_to_opt_string(opt_str: Option<&str>) -> Option<String> {
    opt_str.map(|s| s.to_string())
}

impl From<tokio_postgres::Error> for SQLError {
    fn from(error: tokio_postgres::Error) -> Self {
        match PostgresProxy::map_to_db_error(error) {
            Ok(db_err) => {
                let code = Some(String::from(db_err.code().code()));
                let column = opt_str_to_opt_string(db_err.column());
                let constraint = opt_str_to_opt_string(db_err.constraint());
                let data_type = opt_str_to_opt_string(db_err.datatype());
                let detail = opt_str_to_opt_string(db_err.detail());
                let file = opt_str_to_opt_string(db_err.file());
                let hint = opt_str_to_opt_string(db_err.hint());
                let line = db_err.line();
                let message = db_err.message().to_string();
                let position = db_err.position().map(|ep| QueryErrorPoisition::from(ep));
                let routine = opt_str_to_opt_string(db_err.routine());
                let schema = opt_str_to_opt_string(db_err.schema());
                let severity = Some(db_err.severity().to_string());
                let table = opt_str_to_opt_string(db_err.table());
                let where_ = opt_str_to_opt_string(db_err.where_());

                SQLError {
                    code,
                    column,
                    constraint,
                    data_type,
                    detail,
                    file,
                    hint,
                    line,
                    message,
                    position,
                    routine,
                    schema,
                    severity,
                    table,
                    where_,
                    ..Default::default()
                }
            }
            Err(err) => SQLError::new(err.to_string()),
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum SQLResult {
    Result(Option<SQLResultSet>),
    ResultWithStatistics {
        result: Option<SQLResultSet>,
        statistics: Option<SQLResultSet>,
    },
    Error(SQLError),
}

impl SQLResult {
    pub fn new_result(result: Option<SQLResultSet>) -> SQLResult {
        SQLResult::Result(result)
    }

    pub fn new_result_with_statistics(
        result: Option<SQLResultSet>,
        statistics: Option<SQLResultSet>,
    ) -> Self {
        Self::ResultWithStatistics { result, statistics }
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

pub struct SavePoint {
    name: String,
}

pub trait SQLClient<C> {
    fn execute_stmt(
        &mut self,
        statement: &str,
        parameters: &[Value],
        with_statistics: bool,
    ) -> Result<SQLResult>;
    fn set_config(&mut self, config: C) -> Result<SQLResult>;
    fn set_autocommit(&mut self, autocommit: bool) -> Result<SQLResult>;
    fn commit(&mut self) -> Result<SQLResult>;
    fn rollback(&mut self) -> Result<SQLResult>;
    fn add_savepoint(&mut self, name: &str) -> Result<SQLResult>;
    fn rollback_to_savepoint(&mut self, name: &str) -> Result<SQLResult>;
}

pub fn execute_stmt<C>(
    stmt: &str,
    params: &[Value],
    with_statistics: bool,
    proxy: Arc<Mutex<dyn SQLClient<C>>>,
) -> Result<SQLResult> {
    let mut proxy_lock = proxy.lock().unwrap();
    proxy_lock.execute_stmt(stmt, params, with_statistics)
}

pub fn get_schema_stmt(schema: &str, stmt: &str) -> String {
    stmt.to_lowercase()
        .replace(COMPANY_PLACEHOLDER, &format!("{}.", schema))
}
