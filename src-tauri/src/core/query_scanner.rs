use std::cell::RefCell;

use anyhow::{anyhow, Result};
use oracle::sql_type::ToSql as oracle_ToSql;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio_postgres::{Statement as PgStmt, types::ToSql as pg_ToSql};

use crate::{
    handlers::query_runner::Query,
    proxies::sql_common::{SQLError, SQLResultSet},
};
use crate::proxies::{oracle::OracleClient, postgres::PostgresProxy};
use crate::utilities::{
    oracle::process_statement as process_oracle_statement,
    postgres::process_statement as process_pg_statement,
};

use super::{
    oracle_param_mapper::map_param,
    parameter_iterator::{DBParamIter, ParameterIterator, ParamSeeds},
    postgres_param_mapper::map_to_sql,
};

#[derive(Serialize, Deserialize, Debug)]
pub enum ParameterGenerateStrategy {
    Normal,
    Cartesian,
}

pub struct QueryScanner<'a> {
    params_iter: DBParamIter<'a>,
    query: &'a Query,
    drained: bool,
    finished: usize,
}

impl<'a> Iterator for QueryScanner<'a> {
    type Item = Result<SQLResultSet, SQLError>;

    fn next(&mut self) -> Option<Self::Item> {
        if self.drained() {
            return None;
        }

        Some(self.next_result())
    }
}

impl<'a> QueryScanner<'a> {
    pub fn new(query: &'a Query, params_iter: DBParamIter<'a>) -> Self {
        Self {
            params_iter,
            drained: false,
            finished: 0,
            query,
        }
    }

    pub fn total(&self) -> usize {
        let params_iter = &self.params_iter;
        match params_iter {
            DBParamIter::Oracle(pi) => pi.borrow().total(),
            DBParamIter::Postgres(pi) => pi.borrow().total(),
        }
    }

    pub fn current_params(&self) -> Option<Vec<Value>> {
        let cur_idx = match &self.params_iter {
            DBParamIter::Oracle(params_iter) => params_iter.borrow().current_indexes(),
            DBParamIter::Postgres(params_iter) => params_iter.borrow().current_indexes(),
        };
        let empty_params = vec![];

        Some(
            self.query
                .parameters()
                .unwrap_or(&empty_params)
                .iter()
                .enumerate()
                .map(|(i, p)| {
                    let index = cur_idx[i];
                    p.get(index).unwrap_or(&Value::Null).clone()
                })
                .collect(),
        )
    }

    fn next_result(&mut self) -> Result<SQLResultSet, SQLError> {
        let param_iter = &self.params_iter;
        let result = match param_iter {
            DBParamIter::Oracle(params_iter) => self.next_oracle_result(params_iter),
            DBParamIter::Postgres(params_iter) => self.next_postgres_result(params_iter),
        };
        self.finished += 1;
        if self.finished == self.total() || result.is_err() {
            self.drained = true;
        }

        result
    }

    fn next_oracle_result(
        &self,
        params_iter: &RefCell<ParameterIterator<Box<dyn oracle_ToSql>, String>>,
    ) -> Result<SQLResultSet, SQLError> {
        let mut param_iter_ref = params_iter.borrow_mut();
        let next_params_opt = param_iter_ref.next();
        let client = crate::proxies::oracle::get_proxy();
        let mut client_lock = client.lock().unwrap();
        let conn = client_lock.get_connection()?;
        let conn_lock = conn.lock().unwrap();
        let next_params = match next_params_opt {
            Some(params) => params,
            None => vec![],
        };
        let mut params_unboxed = Vec::with_capacity(next_params.len());
        for i in 0..next_params.len() {
            params_unboxed.push(next_params[i].as_ref());
        }

        let stmt = param_iter_ref.prepared_stmt();

        OracleClient::execute_stmt_mapped(stmt, &params_unboxed, &conn_lock)
    }

    fn next_postgres_result(
        &self,
        params_iter: &RefCell<ParameterIterator<Box<dyn pg_ToSql + Sync>, PgStmt>>,
    ) -> Result<SQLResultSet, SQLError> {
        let mut param_iter_ref = params_iter.borrow_mut();
        let next_params_opt = param_iter_ref.next();
        let next_params = next_params_opt.unwrap_or(vec![]);
        let mut params_unboxed = Vec::with_capacity(next_params.len());
        for param_boxed in next_params {
            params_unboxed.push(param_boxed.as_ref());
        }

        let prepared_stmt = param_iter_ref.prepared_stmt();

        crate::proxies::postgres::get_runtime()
            .lock()
            .unwrap()
            .block_on(async {
                log::debug!("got postgres runtime lock.");
                let proxy = crate::proxies::postgres::get_proxy();
                let mut proxy_lock = proxy.lock().unwrap();
                log::debug!("got postgres proxy lock.");
                let client = proxy_lock.get_connection().await?;
                let client_lock = client.lock().unwrap();
                log::debug!("got postgres connection lock.");
                PostgresProxy::execute_prepared(prepared_stmt, &params_unboxed, &client_lock).await
            })
    }

    pub fn finished(&self) -> usize {
        self.finished
    }

    pub fn drained(&self) -> bool {
        if self.drained {
            return true;
        }

        match &self.params_iter {
            DBParamIter::Oracle(params_iter) => params_iter.borrow().drained(),
            DBParamIter::Postgres(params_iter) => params_iter.borrow().drained(),
        }
    }

    pub fn map_oracle_param_seeds(schema: String, query: &Query) -> Result<ParamSeeds> {
        let emptry_params = vec![];
        let params = query.parameters().unwrap_or(&emptry_params);
        let processed_stmt = process_oracle_statement(query.statement(), &schema)?;

        let client_lock = crate::proxies::oracle::get_proxy();
        let mut client = client_lock.lock().unwrap();
        let conn_lock = client.get_connection()?;
        let conn = conn_lock.lock().unwrap();

        let mut mapped_params = Vec::with_capacity(params.len());

        for (i, pp) in params.iter().enumerate() {
            let mut mapped_p = Vec::with_capacity(pp.len());
            for p in pp {
                mapped_p.push(map_param(Some(&processed_stmt), Some(i), p, &conn)?)
            }
            mapped_params.push(mapped_p);
        }

        Ok(ParamSeeds::Oracle(processed_stmt, mapped_params))
    }

    pub fn map_postgres_param_seeds(schema: String, query: &Query) -> Result<ParamSeeds> {
        let emptry_params = vec![];
        crate::proxies::postgres::get_runtime()
            .lock()
            .or_else(|e| {
                log::error!("try to get postgres runtime error: {}", e);
                Err(anyhow!("Something was wrong: {}", e))
            })?
            .block_on(async {
                log::debug!("got postgres runtime lock.");
                let proxy_lock = crate::proxies::postgres::get_proxy();
                let mut proxy = proxy_lock.lock().unwrap();
                log::debug!("got postgres proxy lock.");
                let client_lock = proxy.get_connection().await?;
                let client = client_lock.lock().unwrap();

                let processed_stmt = process_pg_statement(query.statement(), &schema)?;
                let prepared_stmt = client.prepare(&processed_stmt).await?;
                let params = query.parameters().unwrap_or(&emptry_params);
                let param_types = prepared_stmt.params();

                if params.len() != param_types.len() {
                    return Err(anyhow!(
                        "The number of params are not matched, expect {}, actual {}",
                        param_types.len(),
                        params.len()
                    ));
                }

                let mut mapped_params = Vec::with_capacity(params.len());

                for (i, param_list) in params.iter().enumerate() {
                    let mut mapped_param_list = Vec::with_capacity(param_list.len());

                    for param in param_list {
                        mapped_param_list.push(map_to_sql(param, &param_types[i])?);
                    }
                    mapped_params.push(mapped_param_list);
                }

                Ok(ParamSeeds::Postgres(prepared_stmt, mapped_params))
            })
    }
}
