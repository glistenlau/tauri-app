use std::sync::Arc;

use anyhow::{anyhow, Result};
use futures::{future, lock::Mutex};
use lazy_static::lazy_static;

use serde_json::Value;
use tokio::spawn;
use tokio_postgres::{error::DbError, types::ToSql, Client, Error, NoTls, Statement};

use crate::{
    core::postgres_param_mapper::map_to_sql, proxies::sql_common::generate_param_stmt,
    utilities::postgres::get_row_values,
};

use super::sql_common::{Config, SQLClient, SQLError, SQLResult, SQLResultSet};

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

pub struct PostgresProxy {
    pub config: Config,
    pub client: Option<Arc<Mutex<Client>>>,
    autocommit: bool,
    uncommit_count: usize,
}

impl PostgresProxy {
    const fn new(config: Config) -> PostgresProxy {
        PostgresProxy {
            config: config,
            client: None,
            autocommit: true,
            uncommit_count: 0,
        }
    }

    pub async fn get_connection(&mut self) -> Result<Arc<Mutex<Client>>, Error> {
        if self.client.is_none() || self.client.as_ref().unwrap().lock().await.is_closed() {
            log::debug!("try to obtain a new postgres connection, is the connection present: {}, thread id: {:?}", self.client.is_some(), std::thread::current().id());
            if self.client.is_some() {
                log::debug!(
                    "current connection has {} strong ref",
                    Arc::strong_count(self.client.as_ref().unwrap())
                );
            }
            let conn_res = self.connect().await?;
            conn_res
                .batch_execute("SET search_path TO anaconda")
                .await?;

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

    #[tokio::main]
    pub async fn validate_stmts(stmts: Vec<&str>) -> Result<Vec<QueryVlidationResult>, Error> {
        // use a new connection to do the query validation
        let client = get_proxy().lock().await.connect().await?;
        client.execute("SET search_path TO anaconda", &[]).await?;
        let pending_tasks = stmts
            .iter()
            .map(|&s| PostgresProxy::validate_stmt(s, &client));
        future::try_join_all(pending_tasks).await
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

    pub async fn validate_statement(stmt: &str, client: &Client) -> Result<SQLResult, Error> {
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
    #[tokio::main]
    async fn set_config(&mut self, db_config: Config) -> Result<SQLResult> {
        self.config = db_config;
        self.client = None;
        match self.get_connection().await {
            Ok(_) => Ok(SQLResult::new_result(None)),
            Err(e) => Ok(SQLResult::new_error(SQLError::new_postgres_error(e, ""))),
        }
    }

    #[tokio::main]
    async fn set_autocommit(&mut self, autocommit: bool) -> Result<SQLResult> {
        if self.autocommit == autocommit {
            log::warn!(
                "Try to set Postgres autocommit to the same value: {}",
                autocommit
            );
            return Ok(SQLResult::new_result(None));
        }

        self.autocommit = autocommit;
        if let Some(client_lock) = &self.client {
            let client = client_lock.lock().await;
            if autocommit {
                Self::commit_transaction(&client).await?;
            } else {
                Self::start_transaction(&client).await?;
            }
        }

        Ok(SQLResult::new_result(None))
    }

    #[tokio::main]
    async fn commit(&mut self) -> Result<SQLResult> {
        if let Some(client_lock) = &self.client {
            let client = client_lock.lock().await;
            Self::commit_transaction(&client).await?;
            if !self.autocommit {
                Self::start_transaction(&client).await?;
            }
        }
        Ok(SQLResult::new_result(None))
    }

    #[tokio::main]
    async fn rollback(&mut self) -> Result<SQLResult> {
        if let Some(client_lock) = &self.client {
            let client = client_lock.lock().await;
            Self::rollback_transaction(&client).await?;
            if !self.autocommit {
                Self::start_transaction(&client).await?;
            }
        }
        Ok(SQLResult::new_result(None))
    }

    #[tokio::main]
    async fn add_savepoint(&mut self, _name: &str) -> Result<SQLResult> {
        if self.autocommit {
            return Ok(SQLResult::new_error(SQLError::new(
                "Can't add savepoint when autocommit on.".to_string(),
            )));
        }
        if let Some(client_lock) = &self.client {
            let client = client_lock.lock().await;
            Self::rollback_transaction(&client).await?;
            if !self.autocommit {
                Self::start_transaction(&client).await?;
            }
        }
        Ok(SQLResult::new_result(None))
    }

    fn rollback_to_savepoint(&mut self, _name: &str) -> Result<SQLResult> {
        todo!()
    }

    #[tokio::main]
    async fn execute_stmt(
        &mut self,
        statement: &str,
        parameters: &[Value],
        _with_statistics: bool,
    ) -> Result<SQLResult> {
        let client = self.get_connection().await?;
        let client_lock = client.lock().await;

        let result =
            match Self::execute_string_statement(&statement, &parameters, &client_lock).await {
                Ok(rs) => SQLResult::new_result(Some(rs)),
                Err(e) => SQLResult::new_error(e),
            };
        Ok(result)
    }

    #[tokio::main]
    async fn validate_stmts(&mut self, stmts: &[&str]) -> Result<Vec<SQLResult>> {
        let client = self.get_connection().await?;
        let client_lock = client.lock().await;

        client_lock
            .execute("SET search_path TO anaconda", &[])
            .await?;
        let pending_tasks = stmts
            .iter()
            .map(|&s| Self::validate_statement(s, &client_lock));
        match future::try_join_all(pending_tasks).await {
            Ok(res) => Ok(res),
            Err(e) => Err(e.into()),
        }
    }
}

lazy_static! {
    static ref INSTANCE: Arc<Mutex<PostgresProxy>> = Arc::new(Mutex::new(PostgresProxy::new(
        Config::new("localhost", "5432", "planning", "postgres", "#postgres#")
    )));
}

pub fn get_proxy() -> Arc<Mutex<PostgresProxy>> {
    Arc::clone(&INSTANCE)
}
