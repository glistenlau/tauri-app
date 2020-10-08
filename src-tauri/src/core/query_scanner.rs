use std::{cell::RefCell, rc::Rc, sync::Arc};

use super::parameter_iterator::{DBParamIter, ParamSeeds, ParameterIterator};
use crate::{
    handlers::query_runner::Query,
    proxies::sql_common::{SQLError, SQLResultSet},
};
use anyhow::Result;
use oracle::sql_type::ToSql;
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
    statement: String,
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
    pub fn new(schema: String, query: &'a Query, params_iter: DBParamIter<'a>) -> Result<Self> {
        let statement = query
            .statement()
            .replace("COMPANY_", &format!("{}.", schema));

        Ok(Self {
            params_iter,
            drained: false,
            finished: 0,
            query,
            statement,
        })
    }

    pub fn total(&self) -> usize {
        let params_iter = &self.params_iter;
        match params_iter {
            DBParamIter::Oracle(Some(pi)) => pi.borrow().total(),
            DBParamIter::Postgres(Some(pi)) => pi.borrow().total(),
            _ => 1,
        }
    }

    pub fn current_params(&self) -> Option<Vec<Value>> {
        let cur_idx = match &self.params_iter {
            DBParamIter::Oracle(Some(params_iter)) => params_iter.borrow().current_indexes(),
            DBParamIter::Postgres(Some(params_iter)) => params_iter.borrow().current_indexes(),
            _ => return None,
        };

        Some(
            self.query
                .parameters()
                .unwrap()
                .iter()
                .enumerate()
                .map(|(i, p)| {
                    let index = cur_idx[i];
                    p.get(index).unwrap().clone()
                })
                .collect(),
        )
    }

    fn next_result(&mut self) -> Result<SQLResultSet, SQLError> {
        let param_iter = &self.params_iter;
        let result = match param_iter {
            DBParamIter::Oracle(params_iter) => {
                let pi = match params_iter {
                    Some(p_i) => {Some(p_i)}
                    None => {None}
                };
                self.next_oracle_result(pi)
            }
            DBParamIter::Postgres(params_iter) => {
                let pi = match params_iter {
                    Some(p_i) => {Some(p_i)}
                    None => {None}
                };
                self.next_postgres_result(pi)
            }
        };
        self.finished += 1;
        if self.finished == self.total() || result.is_err() {
            self.drained = true;
        }

        result
    }

    fn next_oracle_result(
        &self,
        params_iter: Option<&RefCell<ParameterIterator<Box<dyn ToSql>>>>,
    ) -> Result<SQLResultSet, SQLError> {
        let next_params_opt = match params_iter {
            Some(pi) => pi.borrow_mut().next(),
            None => None,
        };
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

        client_lock.execute_stmt_mapped(&self.statement, &params_unboxed, &conn_lock)
    }

    fn next_postgres_result(
        &self,
        params_iter: Option<&RefCell<ParameterIterator<String>>>,
    ) -> Result<SQLResultSet, SQLError> {
        let next_params = match params_iter {
            Some(pi) => pi.borrow_mut().next(),
            None => None,
        };

        crate::proxies::postgres::get_runtime()
            .lock()
            .unwrap()
            .block_on(async {
                let proxy_lock = crate::proxies::postgres::get_proxy();
                let mut proxy = proxy_lock.lock().unwrap();
                let client_lock = proxy.get_connection().await?;
                let client = client_lock.lock().unwrap();
                crate::proxies::postgres::PostgresProxy::execute_mapped_statement(
                    &self.statement,
                    next_params.as_deref(),
                    &client,
                )
                .await
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
            DBParamIter::Oracle(Some(params_iter)) => params_iter.borrow().drained(),
            DBParamIter::Postgres(Some(params_iter)) => params_iter.borrow().drained(),
            _ => false,
        }
    }

    fn map_param_seeds(schema: String, query: &Query) -> Result<ParamSeeds> {
        let paramSeeds = match query.db_type() {
            crate::proxies::sql_common::DBType::Oracle => {
                let seeds = if query.parameters().is_none() {
                    vec![]
                } else {
                    Self::map_oracle_param_seeds(schema, query)?
                };
                ParamSeeds::Oracle(seeds)
            }
            crate::proxies::sql_common::DBType::Postgres => {
                let seeds = if query.parameters().is_none() {
                    vec![]
                } else {
                    Self::map_postgres_param_seeds(schema, query)?
                };
                ParamSeeds::Postgres(seeds)
            }
        };

        Ok(paramSeeds)
    }

    pub fn map_oracle_param_seeds(schema: String, query: &Query) -> Result<Vec<Vec<Box<dyn ToSql>>>> {
        let params = match query.parameters() {
            Some(ps) => ps,
            None => return Ok(vec![]),
        };
        let client_lock = crate::proxies::oracle::get_proxy();
        let mut client = client_lock.lock().unwrap();
        let conn_lock = client.get_connection()?;
        let conn = conn_lock.lock().unwrap();
        let mut mapped_params = Vec::with_capacity(params.len());
        let statement = query
            .statement()
            .replace("COMPANY_", &format!("{}.", schema));

        for (i, pp) in params.iter().enumerate() {
            let mut mapped_p = Vec::with_capacity(pp.len());
            for p in pp {
                mapped_p.push(client.map_param(Some(&statement), Some(i), p, &conn)?)
            }
            mapped_params.push(mapped_p);
        }

        Ok(mapped_params)
    }

    pub fn map_postgres_param_seeds(schema: String, query: &Query) -> Result<Vec<Vec<String>>> {
        let params = match query.parameters() {
            Some(ps) => ps,
            None => return Ok(vec![]),

        };
        let mut mapped_params = Vec::with_capacity(params.len());

        for (i, pp) in params.iter().enumerate() {
            let mut mapped_p = Vec::with_capacity(pp.len());
            for p in pp {
                mapped_p.push(crate::proxies::postgres::PostgresProxy::map_param(p)?);
            }
            mapped_params.push(mapped_p);
        }

        Ok(mapped_params)
    }

    // fn build_parameters_iterator(schema: &str, query: &Query) -> Result<DBParamIter> {
    //     let params_iter = match query.db_type() {
    //         crate::proxies::sql_common::DBType::Oracle => {
    //             if query.parameters().is_none() {
    //                 DBParamIter::Oracle(None)
    //             } else {
    //                 Self::build_oracle_parameters_iterator(schema, query)?
    //             }
    //         }
    //         crate::proxies::sql_common::DBType::Postgres => {
    //             if query.parameters().is_none() {
    //                 DBParamIter::Postgres(None)
    //             } else {
    //                 Self::build_postgres_parameters_iterator(schema, query)?
    //             }
    //         }
    //     };

    //     Ok(params_iter)
    // }

    // fn build_oracle_parameters_iterator(schema: &str, query: &Query) -> Result<DBParamIter> {
    //     let client = crate::proxies::oracle::get_proxy().lock().unwrap();
    //     let conn = client.get_connection()?.lock().unwrap();
    //     let params = query.parameters().unwrap();
    //     let mut mapped_params = Vec::with_capacity(params.len());
    //     let statement = query
    //         .statement()
    //         .replace("COMPANY_", &format!("{}.", schema));

    //     for (i, pp) in params.iter().enumerate() {
    //         let mut mapped_p = Vec::with_capacity(pp.len());
    //         for p in pp {
    //             mapped_p.push(client.map_param(Some(&statement), Some(i), p, &conn)?)
    //         }
    //         mapped_params.push(mapped_p);
    //     }

    //     let params_iter = ParameterIterator::new(&mapped_params, &query.mode());

    //     Ok(DBParamIter::Oracle(Some(params_iter)))
    // }

    // fn build_postgres_parameters_iterator(schema: &str, query: &Query) -> Result<DBParamIter> {
    //     let params = query.parameters().unwrap();
    //     let mut mapped_params = Vec::with_capacity(params.len());

    //     for (i, pp) in params.iter().enumerate() {
    //         let mut mapped_p = Vec::with_capacity(pp.len());
    //         for p in pp {
    //             mapped_p.push(crate::proxies::postgres::PostgresProxy::map_param(p)?);
    //         }
    //         mapped_params.push(mapped_p);
    //     }

    //     let params_iter = ParameterIterator::new(&mapped_params, &query.mode());

    //     Ok(DBParamIter::Postgres(Some(params_iter)))
    // }
}
