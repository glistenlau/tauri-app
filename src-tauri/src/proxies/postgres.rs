use anyhow::{anyhow, Result};
use futures::future;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex, MutexGuard};
use tokio::{runtime::Runtime, spawn};
use tokio_postgres::{error::DbError, types::ToSql, Client, Error, NoTls, Statement};

use crate::{core::postgres_param_mapper::map_to_sql, utilities::postgres::get_row_values};

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
    autocommit: bool,
    uncommit_count: usize,
}

impl PostgresProxy {
    const fn new(config: ConnectionConfig) -> PostgresProxy {
        PostgresProxy {
            config: config,
            client: None,
            autocommit: true,
            uncommit_count: 0,
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

            if !self.autocommit {
                Self::start_transaction(&conn_res).await?;
            }

            self.client = Some(Arc::new(Mutex::new(conn_res)));
        }

        Ok(Arc::clone(self.client.as_ref().unwrap()))
    }

    async fn connect(&self) -> Result<Client, Error> {
        log::debug!("trying to get new postgres connection.");
        let (client, connection) =
            tokio_postgres::connect(&self.config.to_key_value_string(), NoTls).await?;
        log::debug!("got new postgres connection");

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
        log::debug!("validating query: {}", stmt);
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

    pub async fn execute_string_statement(
        stmt: &str,
        params: &[Value],
        client: &Client,
    ) -> Result<SQLResultSet, SQLError> {
        let prepared_stmt = client.prepare(&stmt).await?;
        let stmt_params = prepared_stmt.params();

        if params.len() != stmt_params.len() {
            return Err(SQLError::from(anyhow!(
                "The number of params not matched, expect {}, actual {}",
                stmt_params.len(),
                params.len()
            )));
        }

        let mut mapped_params = Vec::with_capacity(params.len());

        for (idx, param) in params.iter().enumerate() {
            mapped_params.push(map_to_sql(param, &stmt_params[idx])?);
        }
        let mut mapped_params_unbox = Vec::with_capacity(mapped_params.len());
        for param_box in &mapped_params {
            mapped_params_unbox.push(param_box.as_ref());
        }

        Self::execute_prepared(&prepared_stmt, &mapped_params_unbox, client).await
    }

    pub async fn execute_prepared(
        stmt: &Statement,
        params: &[&(dyn ToSql + Sync)],
        client: &Client,
    ) -> Result<SQLResultSet, SQLError> {
        let result_set = if stmt.columns().len() == 0 {
            match client.execute(stmt, params).await {
                Ok(result) => SQLResultSet::new(result as usize, None, None),
                Err(sql_err) => {
                    // log::debug!("execute postgres error: {}, rollback...", &sql_err);
                    // Self::rollback_transaction(client).await?;
                    return Err(SQLError::from(sql_err));
                }
            }
        } else {
            let result = client.query(stmt, params).await?;
            let columns = stmt.columns();
            let mut rows = Vec::with_capacity(result.len());
            for row in &result {
                rows.push(get_row_values(row, columns)?)
            }
            let column_strs = columns
                .iter()
                .map(|column| String::from(column.name()))
                .collect();

            log::debug!("Got postgres query result: {:?}", rows);

            SQLResultSet::new(rows.len(), Some(column_strs), Some(rows))
        };

        Ok(result_set)
    }

    async fn start_transaction(client: &Client) -> Result<(), Error> {
        log::debug!("Start Postgres transaction.");
        Ok(client.batch_execute("BEGIN").await?)
    }

    async fn commit_transaction(client: &Client) -> Result<(), Error> {
        log::debug!("Commit Postgres transaction.");
        Ok(client.batch_execute("COMMIT").await?)
    }

    async fn rollback_transaction(client: &Client) -> Result<(), Error> {
        log::debug!("Rollback Postgres transaction.");
        Ok(client.batch_execute("ROLLBACK").await?)
    }
}

impl<'a> SQLClient<ConnectionConfig> for PostgresProxy {
    fn execute<'b>(
        &mut self,
        statement: &str,
        schema: &str,
        parameters: &[Value],
    ) -> Result<SQLResult> {
        log::debug!("start executing postgres statement...");

        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                let client = self.get_connection().await?;
                let client_lock = client.lock().unwrap();

                let result =
                    match Self::execute_string_statement(&statement, &parameters, &client_lock)
                        .await
                    {
                        Ok(rs) => SQLResult::new_result(Some(rs)),
                        Err(e) => SQLResult::new_error(e),
                    };
                Ok(result)
            })
    }

    fn set_config(&mut self, config: ConnectionConfig) -> Result<SQLResult> {
        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                self.config = config;
                match self.get_connection().await {
                    Ok(_) => Ok(SQLResult::new_result(None)),
                    Err(e) => Ok(SQLResult::new_error(SQLError::new_postgres_error(e, ""))),
                }
            })
    }

    fn set_autocommit(&mut self, autocommit: bool) -> Result<SQLResult> {
        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                if self.autocommit == autocommit {
                    log::warn!(
                        "Try to set Postgres autocommit to the same value: {}",
                        autocommit
                    );
                    return Ok(SQLResult::new_result(None));
                }

                self.autocommit = autocommit;
                if let Some(client_lock) = &self.client {
                    let client = client_lock.lock().unwrap();
                    if autocommit {
                        Self::commit_transaction(&client).await?;
                    } else {
                        Self::start_transaction(&client).await?;
                    }
                }

                Ok(SQLResult::new_result(None))
            })
    }

    fn commit(&mut self) -> Result<SQLResult> {
        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                if let Some(client_lock) = &self.client {
                    let client = client_lock.lock().unwrap();
                    Self::commit_transaction(&client).await?;
                    if !self.autocommit {
                        Self::start_transaction(&client).await?;
                    }
                }
                Ok(SQLResult::new_result(None))
            })
    }

    fn rollback(&mut self) -> Result<SQLResult> {
        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                if let Some(client_lock) = &self.client {
                    let client = client_lock.lock().unwrap();
                    Self::rollback_transaction(&client).await?;
                    if !self.autocommit {
                        Self::start_transaction(&client).await?;
                    }
                }
                Ok(SQLResult::new_result(None))
            })
    }

    fn add_savepoint(&mut self, name: &str) -> Result<SQLResult> {
        POSTGRES_RUNTIME
            .lock()
            .or_else(|e| {
                log::error!("failed to get postgres runtime: {}", e);
                Err(anyhow!("failed to get postgres runtime: {}", e))
            })?
            .block_on(async {
                if self.autocommit {
                    return Ok(SQLResult::new_error(SQLError::new(
                        "Can't add savepoint when autocommit on.".to_string(),
                    )));
                }
                if let Some(client_lock) = &self.client {
                    let client = client_lock.lock().unwrap();
                    Self::rollback_transaction(&client).await?;
                    if !self.autocommit {
                        Self::start_transaction(&client).await?;
                    }
                }
                Ok(SQLResult::new_result(None))
            })
    }

    fn rollback_to_savepoint(&mut self, name: &str) -> Result<SQLResult> {
        todo!()
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
    log::debug!("got postgres runtime.");
    Arc::clone(&POSTGRES_RUNTIME)
}
