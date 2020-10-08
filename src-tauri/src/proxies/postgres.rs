use anyhow::{anyhow, Result};
use futures::future;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};
use std::ops::{Deref, DerefMut};
use tokio::{runtime::Runtime, spawn};
use tokio_postgres::{error::DbError, Client, Error, NoTls};

use super::sql_common::{SQLClient, SQLError, SQLResult, SQLResultSet};

pub struct QueryVlidationResult {
    pub pass: bool,
    pub error: Option<SQLError>,
}

impl QueryVlidationResult {
    fn new_pass() -> QueryVlidationResult {
        QueryVlidationResult::new(true, None)
    }

    fn new_fail_err(error: SQLError) -> QueryVlidationResult {
        QueryVlidationResult::new(false, Some(error))
    }

    fn new(pass: bool, error: Option<SQLError>) -> QueryVlidationResult {
        QueryVlidationResult { pass, error }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ConnectionConfig {
    host: String,
    port: String,
    user: String,
    password: String,
    dbname: String,
}

impl ConnectionConfig {
    fn new(host: &str, port: &str, user: &str, password: &str, dbname: &str) -> ConnectionConfig {
        ConnectionConfig {
            host: String::from(host),
            port: String::from(port),
            user: String::from(user),
            password: String::from(password),
            dbname: String::from(dbname),
        }
    }

    fn to_key_value_string(&self) -> String {
        format!(
            "host={} port={} user={} password={} dbname={}",
            self.host, self.port, self.user, self.password, self.dbname
        )
    }
}

pub struct PostgresProxy {
    config: ConnectionConfig,
    client: Option<Arc<Mutex<Client>>>,
}

// impl Deref for PostgresProxy {
//     type Target = Self;

//     fn deref(&self) -> &Self::Target {
//         &self
//     }
// }

// impl DerefMut for PostgresProxy {
//     fn deref_mut(&mut self) -> &mut Self::Target {
//         &mut self
//     }
// }


impl PostgresProxy {
    const fn new(config: ConnectionConfig) -> PostgresProxy {
        PostgresProxy {
            config: config,
            client: None,
        }
    }

    pub async fn get_connection(&mut self) -> Result<Arc<Mutex<Client>>, Error> {
        if self.client.is_none() || self.client.as_ref().unwrap().lock().unwrap().is_closed() {
            log::debug!("try to obtain a new postgres connection, is the connection present: {}, thread id: {:?}", self.client.is_some(), std::thread::current().id());
            if self.client.is_some() {
                log::debug!(
                    "current connection has {} strong ref",
                    Arc::strong_count(self.client.as_ref().unwrap())
                );
            }
            let conn_res = self.connect().await?;
            self.client = Some(Arc::new(Mutex::new(conn_res)));
        }

        Ok(Arc::clone(self.client.as_ref().unwrap()))
    }

    async fn connect(&self) -> Result<Client, Error> {
        let (client, connection) =
            tokio_postgres::connect(&self.config.to_key_value_string(), NoTls).await?;

        spawn(async move {
            if let Err(e) = connection.await {
                log::error!("postgres connection error: {}", e);
            }
            log::debug!("postgres connection closed.");
        });

        Ok(client)
    }

    pub fn validate_stmts(stmts: Vec<&str>) -> Result<Vec<QueryVlidationResult>, Error> {
        POSTGRES_RUNTIME.lock().unwrap().block_on(async {
            // use a new connection to do the query validation
            let client = get_proxy().lock().unwrap().connect().await?;
            client.execute("SET search_path TO anaconda", &[]).await?;
            let pending_tasks = stmts
                .iter()
                .map(|&s| PostgresProxy::validate_stmt(s, &client));
            future::try_join_all(pending_tasks).await
        })
    }

    pub async fn validate_stmt(stmt: &str, client: &Client) -> Result<QueryVlidationResult, Error> {
        let company_stmt = stmt.replace("COMPANY_", "GREENCO.");
        let split = company_stmt.split("?");
        let mut mapped_stmt = String::with_capacity(company_stmt.len());

        for (i, part) in split.enumerate() {
            if i > 0 {
                mapped_stmt.push_str(&format!("${}", i));
            }
            mapped_stmt.push_str(part)
        }

        match client.prepare(&mapped_stmt).await {
            Ok(_) => Ok(QueryVlidationResult::new_pass()),
            Err(e) => {
                let sql_error = SQLError::new_postgres_error(e, &mapped_stmt);
                Ok(QueryVlidationResult::new_fail_err(sql_error))
            }
        }
    }

    async fn execute(stmt: &str, client: &Client) -> Result<SQLResultSet, Error> {
        let rsp = client.simple_query(stmt).await?;
        let mut row_count = 0;

        let mut res_columns: Vec<String> = Vec::new();
        let mut res_rows: Vec<Vec<String>> = Vec::new();

        for sqm in rsp {
            match sqm {
                tokio_postgres::SimpleQueryMessage::Row(row) => {
                    let mut res_row = Vec::with_capacity(row.len());
                    for i in 0..row.len() {
                        res_row.push(String::from(row.try_get(i)?.unwrap_or_default()));
                    }
                    res_rows.push(res_row);
                }
                tokio_postgres::SimpleQueryMessage::CommandComplete(count) => {
                    row_count = count as usize;
                }
                tokio_postgres::SimpleQueryMessage::Columns(columns) => {
                    res_columns = columns;
                }
                _ => {}
            }
        }

        Ok(SQLResultSet::new(
            row_count,
            Some(res_columns),
            Some(res_rows),
        ))
    }

    async fn execute_wrap(stmt: &str, client: &Client) -> Result<SQLResultSet, SQLError> {
        match Self::execute(stmt, client).await {
            Ok(rs) => Ok(rs),
            Err(err) => Err(SQLError::new_postgres_error(err, stmt)),
        }
    }

    pub async fn execute_mapped_statement(
        stmt: &str,
        params: Option<&[&String]>,
        client: &Client,
    ) -> Result<SQLResultSet, SQLError> {
        let s = match params {
            Some(ps) => {
                let mut filled_stmt = String::with_capacity(stmt.len());
                let mut stmt_iter = stmt.split("?");
                let mut params_iter = ps.iter();

                filled_stmt.push_str(stmt_iter.next().unwrap_or_default());

                while let (Some(part), Some(param)) = (stmt_iter.next(), params_iter.next()) {
                    filled_stmt.push_str(param);
                    filled_stmt.push_str(part);
                }
                if (stmt_iter.next(), params_iter.next()) != (None, None) {
                    return Err(SQLError::new(
                        "parameters are not matched with the statement...".to_string(),
                    ));
                }
                String::from(filled_stmt)
            }
            None => String::from(stmt),
        };
        
        Self::execute_wrap(&s, client).await
    }

    pub fn map_to_db_error(error: Error) -> Result<DbError, Error> {
        if error.code().is_none() {
            // Not a db error, throw it.
            return Err(error);
        }

        let db_err_opt: Option<Result<Box<DbError>, _>> = error
            .into_source()
            .and_then(|se| Some(se.downcast::<DbError>()));

        if let Some(Ok(db_err)) = db_err_opt {
            Ok(*db_err)
        } else {
            panic!("expected to get a DbError, but failed, something was wrong...")
        }
    }

    fn map_params(params: &[Value]) -> Result<Vec<String>> {
        let mut mapped_params = Vec::with_capacity(params.len());
        for param in params {
            mapped_params.push(Self::map_param(param)?);
        }

        Ok(mapped_params)
    }

    pub fn map_param(param: &Value) -> Result<String> {
        let mapped_param = match param {
            Value::Null => String::from("null"),
            Value::Bool(val) => val.to_string(),
            Value::Number(val) => {
                if val.is_f64() {
                    val.as_f64().unwrap().to_string()
                } else {
                    val.as_i64().unwrap().to_string()
                }
            }
            Value::String(val) => format!("'{}'", val),
            Value::Array(arr) => {
                let mut mapped_arr = Vec::with_capacity(arr.len());
                for val in arr {
                    mapped_arr.push(Self::map_param(val)?);
                }

                mapped_arr.join(",")
            }
            Value::Object(_) => return Err(anyhow!("not support object param for postgres.")),
        };

        Ok(mapped_param)
    }
}

impl<'a> SQLClient<ConnectionConfig> for PostgresProxy {
    fn execute<'b>(&mut self, statement: &str, parameters: &[Value]) -> Result<SQLResult> {
        log::debug!("start executing postgres statement...");


        POSTGRES_RUNTIME.lock().unwrap().block_on(async {
            let client = self.get_connection().await?;
            let client_lock = client.lock().unwrap();
            let mapped_params: Vec<String> = if parameters.len() > 0 {
                match Self::map_params(parameters) {
                    Ok(mapped_params) => mapped_params,
                    Err(e) => {
                        return Err(anyhow!("map parameters error: {}", e));
                    }
                }
            } else {
                vec![]
            };
            let mut mapped_params_ref: Vec<&String> = vec![];

            for i in 0..mapped_params.len() {
                mapped_params_ref.push(mapped_params.get(i).unwrap())
            }

            match Self::execute_mapped_statement(&statement, Some(&mapped_params_ref), &client_lock)
                .await
            {
                Ok(rs) => Ok(SQLResult::new_result(Some(rs))),
                Err(e) => Ok(SQLResult::new_error(e)),
            }
        })
    }

    fn set_config(&mut self, config: ConnectionConfig) -> Result<SQLResult> {
        POSTGRES_RUNTIME.lock().unwrap().block_on(async {
            self.config = config;
            match self.get_connection().await {
                Ok(_) => Ok(SQLResult::new_result(None)),
                Err(e) => Ok(SQLResult::new_error(SQLError::new_postgres_error(e, ""))),
            }
        })
    }
}

lazy_static! {
    static ref INSTANCE: Arc<Mutex<PostgresProxy>> = Arc::new(Mutex::new(PostgresProxy::new(
        ConnectionConfig::new("localhost", "5432", "postgres", "#postgres#", "planning")
    )));
    static ref POSTGRES_RUNTIME: Arc<Mutex<Runtime>> =
        Arc::new(Mutex::new(Runtime::new().unwrap()));
}

pub fn get_proxy() -> Arc<Mutex<PostgresProxy>> {
    Arc::clone(&INSTANCE)
}

pub fn get_runtime() -> Arc<Mutex<Runtime>> {
    Arc::clone(&POSTGRES_RUNTIME)
}
