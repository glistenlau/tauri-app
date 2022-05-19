use std::{sync::Arc, thread};

use anyhow::{anyhow, Result};
use futures::{
    future,
    lock::{Mutex, MutexGuard},
};
use lazy_static::lazy_static;

use serde_json::Value;
use tauri::async_runtime;
use tokio::{runtime::Runtime, spawn};
use tokio_postgres::{error::DbError, types::ToSql, Client, Error, NoTls, Statement};

use crate::{
    core::postgres_param_mapper::map_to_sql, proxies::sql_common::generate_param_stmt,
    utilities::postgres::get_row_values,
};

use super::sql_common::{Config, ConsoleManager, SQLClient, SQLError, SQLResult, SQLResultSet};

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

static PARAM_SIGN: &str = "$";

impl ConsoleManager<Client> {
    pub async fn get_console_conn(&mut self) -> Result<&Client, Error> {
        if self.console_client.is_none() || self.console_client.as_ref().unwrap().is_closed() {
            log::debug!("try to obtain a new postgres console connection, is the connection present: {}, thread id: {:?}", self.console_client.is_some(), std::thread::current().id());

            let conn_res = PostgresProxy::connect(&self.config).await?;
            conn_res
                .batch_execute("SET search_path TO anaconda")
                .await?;

            if !self.autocommit {
                PostgresProxy::start_transaction(&conn_res).await?;
            }

            self.console_client = Some(conn_res);
        }
        Ok(self.console_client.as_ref().unwrap())
    }
}

pub struct PostgresProxy(Arc<Mutex<ConsoleManager<Client>>>);

impl PostgresProxy {
    fn new(config: Config) -> Self {
        let console_manager = Arc::new(Mutex::new(ConsoleManager {
            autocommit: false,
            config,
            console_client: None,
        }));
        PostgresProxy(console_manager)
    }

    pub async fn get_console_manager(&self) -> Result<MutexGuard<'_, ConsoleManager<Client>>> {
        Ok(self.0.lock().await)
    }

    async fn connect(config: &Config) -> Result<Client, Error> {
        log::debug!("trying to get new postgres connection.");
        let (client, connection) =
            tokio_postgres::connect(&config.to_key_value_string(), NoTls).await?;
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
        let rt = Runtime::new().unwrap();
        crossbeam::thread::scope(|s| {
            s.spawn(|_| {
                rt.block_on(async {
                    // use a new connection to do the query validation
                    let manager = get_proxy().get_console_manager().await.unwrap();
                    let client = Self::connect(&manager.config).await?;
                    client.execute("SET search_path TO anaconda", &[]).await?;
                    let pending_tasks = stmts
                        .iter()
                        .map(|&s| PostgresProxy::validate_stmt(s, &client));
                    future::try_join_all(pending_tasks).await
                })
            })
            .join()
            .unwrap()
        })
        .unwrap()
    }

    pub async fn validate_stmt(stmt: &str, client: &Client) -> Result<QueryVlidationResult, Error> {
        log::debug!("validating query: {}", stmt);
        let company_stmt = stmt.replace("COMPANY_", "GREENCO.");
        let mapped_stmt = generate_param_stmt(&company_stmt, PARAM_SIGN);

        match client.prepare(&mapped_stmt).await {
            Ok(_) => Ok(QueryVlidationResult::new_pass()),
            Err(e) => {
                let sql_error = SQLError::new_postgres_error(e, &mapped_stmt);
                Ok(QueryVlidationResult::new_fail_err(sql_error))
            }
        }
    }

    pub async fn validate_statement(stmt: String, client: &Client) -> Result<SQLResult, Error> {
        log::debug!("validating query: {}", stmt);
        let company_stmt = stmt.replace("COMPANY_", "GREENCO.");
        let mapped_stmt = generate_param_stmt(&company_stmt, PARAM_SIGN);

        match client.prepare(&mapped_stmt).await {
            Ok(_) => Ok(SQLResult::new_result(None)),
            Err(e) => {
                let sql_error = SQLError::new_postgres_error(e, &mapped_stmt);
                Ok(SQLResult::new_error(sql_error))
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

impl<'a> SQLClient for PostgresProxy {
    fn set_config(&'static self, db_config: Config) -> Result<SQLResult> {
        let handle = async_runtime::handle();
        thread::spawn(move || {
            handle.block_on(async {
                let mut console_manager = self.get_console_manager().await?;
                console_manager.config = db_config;
                console_manager.console_client = None;
                match console_manager.get_console_conn().await {
                    Ok(_) => Ok(SQLResult::new_result(None)),
                    Err(e) => Ok(SQLResult::new_error(SQLError::new_postgres_error(e, ""))),
                }
            })
        })
        .join()
        .unwrap()
    }

    fn set_autocommit(&'static self, autocommit: bool) -> Result<SQLResult> {
        let handle = async_runtime::handle();
        thread::spawn(move || {
            handle.block_on(async {
                let mut manager = self.get_console_manager().await?;
                if manager.autocommit == autocommit {
                    log::warn!(
                        "Try to set Postgres autocommit to the same value: {}",
                        autocommit
                    );
                    return Ok(SQLResult::new_result(None));
                }

                manager.autocommit = autocommit;
                if let Some(client) = &manager.console_client {
                    if autocommit {
                        Self::commit_transaction(&client).await?;
                    } else {
                        Self::start_transaction(&client).await?;
                    }
                }

                Ok(SQLResult::new_result(None))
            })
        })
        .join()
        .unwrap()
    }

    fn commit_console(&'static self) -> Result<SQLResult> {
        let handle = async_runtime::handle();
        thread::spawn(move || {
            handle.block_on(async {
                let manager = self.get_console_manager().await?;
                if let Some(client) = manager.console_client.as_ref() {
                    Self::commit_transaction(&client).await?;
                    if !manager.autocommit {
                        Self::start_transaction(&client).await?;
                    }
                }
                Ok(SQLResult::new_result(None))
            })
        })
        .join()
        .unwrap()
    }

    fn rollback_console(&'static self) -> Result<SQLResult> {
        let handle = async_runtime::handle();
        thread::spawn(move || {
            handle.block_on(async {
                let manager = self.get_console_manager().await?;
                if let Some(client) = manager.console_client.as_ref() {
                    Self::rollback_transaction(&client).await?;
                    if !manager.autocommit {
                        Self::start_transaction(&client).await?;
                    }
                }
                Ok(SQLResult::new_result(None))
            })
        })
        .join()
        .unwrap()
    }

    fn add_savepoint(&'static self, _name: &str) -> Result<SQLResult> {
        todo!()
        // POSTGRES_RUNTIME
        //     .lock()
        //     .or_else(|e| {
        //         log::error!("failed to get postgres runtime: {}", e);
        //         Err(anyhow!("failed to get postgres runtime: {}", e))
        //     })?
        //     .block_on(async {
        //         if self.autocommit {
        //             return Ok(SQLResult::new_error(SQLError::new(
        //                 "Can't add savepoint when autocommit on.".to_string(),
        //             )));
        //         }
        //         if let Some(client_lock) = &self.client {
        //             let client = client_lock.lock().unwrap();
        //             Self::rollback_transaction(&client).await?;
        //             if !self.autocommit {
        //                 Self::start_transaction(&client).await?;
        //             }
        //         }
        //         Ok(SQLResult::new_result(None))
        //     })
    }

    fn rollback_to_savepoint(&'static self, _name: &str) -> Result<SQLResult> {
        todo!()
    }

    fn execute_stmt(
        &'static self,
        statement: &str,
        parameters: &[Value],
        _with_statistics: bool,
    ) -> Result<SQLResult> {
        let handle = async_runtime::handle();
        let stmt = statement.to_string();
        let parameter_vec: Vec<Value> = parameters.iter().map(|p| p.clone()).collect();
        crossbeam::thread::scope(|s| {
            s.spawn(|_| {
                handle.block_on(async {
                    let mut console_manager = self.get_console_manager().await?;
                    let client = console_manager.get_console_conn().await?;

                    let result = match Self::execute_string_statement(
                        &stmt,
                        &parameter_vec,
                        &client,
                    )
                    .await
                    {
                        Ok(rs) => SQLResult::new_result(Some(rs)),
                        Err(e) => SQLResult::new_error(e),
                    };
                    Ok(result)
                })
            })
            .join()
            .unwrap()
        })
        .unwrap()
    }

    fn validate_stmts(&'static self, stmts: &[&str]) -> Result<Vec<SQLResult>> {
        let handle = async_runtime::handle();
        let stmts_vec: Vec<String> = stmts.iter().map(|stmt| stmt.to_string()).collect();
        thread::spawn(move || {
            handle.block_on(async {
                let mut console_manager = self.get_console_manager().await?;
                let client = console_manager.get_console_conn().await?;

                client.execute("SET search_path TO anaconda", &[]).await?;
                Self::rollback_transaction(client).await;
                let pending_tasks = stmts_vec
                    .iter()
                    .map(|s| Self::validate_statement(s.clone(), client));
                match future::try_join_all(pending_tasks).await {
                    Ok(res) => Ok(res),
                    Err(e) => Err(e.into()),
                }
            })
        })
        .join()
        .unwrap()
    }
}

lazy_static! {
    pub static ref INSTANCE: PostgresProxy = PostgresProxy::new(Config::new(
        "localhost",
        "5432",
        "planning",
        "postgres",
        "#postgres#"
    ));
    static ref POSTGRES_RUNTIME: Arc<Mutex<Runtime>> =
        Arc::new(Mutex::new(Runtime::new().unwrap()));
}

pub fn get_proxy() -> &'static PostgresProxy {
    &*INSTANCE
}

pub fn get_runtime() -> Arc<Mutex<Runtime>> {
    log::debug!("got postgres runtime.");
    Arc::clone(&POSTGRES_RUNTIME)
}
