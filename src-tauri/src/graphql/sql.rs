use std::sync::{Arc, Mutex};

use crate::proxies::oracle;
use crate::proxies::postgres::{self};
use crate::proxies::sql_common::{get_schema_stmt, Config, DBType, SQLClient, SQLResult};
use async_graphql::*;

#[derive(Default)]
pub struct SqlQuery;

#[Object]
impl SqlQuery {
    async fn execute_stmt(
        &self,
        db_type: DBType,
        schema: String,
        stmt: String,
        params: Vec<Json<serde_json::Value>>,
        with_statistics: bool,
    ) -> Result<Json<SQLResult>> {
        let task_fn = |proxy: Arc<Mutex<dyn SQLClient>>| -> anyhow::Result<SQLResult> {
            let params_json: Vec<serde_json::Value> = params
                .iter()
                .map(|param| {
                    async_graphql::InputType::to_value(param)
                        .into_json()
                        .unwrap()
                })
                .collect();

            let mut proxy_lock = proxy.lock().unwrap();
            proxy_lock.execute_stmt(
                &get_schema_stmt(&schema, &stmt),
                &params_json,
                with_statistics,
            )
        };

        match run_sql_task(db_type, task_fn) {
            Ok(sql_res) => Ok(Json::from(sql_res)),
            Err(e) => Err(Error::from(e)),
        }
    }

    async fn validate_stmts(
        &self,
        db_type: DBType,
        stmts: Vec<String>,
    ) -> Result<Json<Vec<SQLResult>>> {
        let task_fn = |proxy: Arc<Mutex<dyn SQLClient>>| -> Vec<SQLResult> {
            let mut proxy_lock = proxy.lock().unwrap();
            let stmts_ref: Vec<&str> = stmts.iter().map(|stmt| stmt.as_ref()).collect();
            proxy_lock.validate_stmts(&stmts_ref).unwrap()
        };
        Ok(Json::from(run_sql_task(db_type, task_fn)))
    }
}

#[derive(Default)]
pub struct SqlMutation;

#[Object]
impl SqlMutation {
    async fn db_config(&self, db_type: DBType, db_config: Config) -> Result<Json<SQLResult>> {
        let res = match db_type {
            DBType::Oracle => {
                let proxy = oracle::get_proxy();
                let mut proxy_lock = proxy.lock().unwrap();
                proxy_lock.set_config(db_config)
            }
            DBType::Postgres => {
                let proxy = postgres::get_proxy();
                let mut proxy_lock = proxy.lock().await;
                proxy_lock.config = db_config;
                proxy_lock.client = None;
                Ok(SQLResult::new_result(None))
            }
        };
        match res {
            Ok(sql_res) => Ok(Json(sql_res)),
            Err(e) => Err(Error::from(e)),
        }
    }
}

fn run_sql_task<F, R>(db_type: DBType, task_fn: F) -> R
where
    F: FnOnce(Arc<Mutex<dyn SQLClient>>) -> R,
{
    match db_type {
        DBType::Oracle => task_fn(oracle::get_proxy()),
        DBType::Postgres => todo!(),
    }
}
