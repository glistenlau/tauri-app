use std::{
    cell::RefCell, collections::HashMap, sync::atomic::AtomicBool, sync::atomic::Ordering,
    sync::mpsc, sync::Arc, sync::Mutex, thread,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::sql_common::{SQLError, SQLResult};
use crate::{
    core::parameter_iterator::DBParamIter, core::parameter_iterator::ParameterIterator,
    core::query_scanner::QueryScanner, handlers::query_runner::Query,
};
use anyhow::Result;
#[derive(Serialize, Deserialize, Debug)]
pub struct ProgressInfo {
    schema: String,
    parameters: Option<Vec<Value>>,
    finished: usize,
    total: usize,
}

impl ProgressInfo {
    pub fn new(
        schema: String,
        parameters: Option<Vec<Value>>,
        finished: usize,
        total: usize,
    ) -> Self {
        Self {
            schema,
            parameters,
            finished,
            total,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ResultPerSchema {
    progress: ProgressInfo,
    results: Option<SQLResult>,
}

impl ResultPerSchema {
    pub fn new(
        schema: String,
        parameters: Option<Vec<Value>>,
        results: Option<SQLResult>,
        finished: usize,
        total: usize,
    ) -> Self {
        Self {
            progress: ProgressInfo::new(schema, parameters, finished, total),
            results,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RunResults {
    results: HashMap<String, Vec<Option<ResultPerSchema>>>,
}

pub fn scan_queries(schemas: Vec<String>, queries: Vec<Query>) -> RunResults {
    let mut results = HashMap::with_capacity(schemas.len());
    for schema in schemas {
        let queries_arc = queries.iter().map(|q| Arc::new(q.clone())).collect();
        let schema_result = scan_schema_queries(schema.clone(), queries_arc);
        results.insert(schema.clone(), schema_result);
    }

    RunResults { results }
}

pub fn scan_schema_queries(
    schema: String,
    queries: Arc<[Arc<Query>]>,
) -> Vec<Option<ResultPerSchema>> {
    let (sender, receiver) = mpsc::channel();
    let stop = Arc::new(AtomicBool::new(false));
    log::debug!("start schema queries scan...");

    for i in 0..queries.len() {
        let queries_clone = Arc::clone(&queries);
        let query = &queries_clone.as_ref()[i];
        let tx = sender.clone();
        let stop = Arc::clone(&stop);
        let schema_clone = schema.clone();
        let query_clone = Arc::clone(query);
        thread::spawn(move || {
            log::debug!("start scan query: {:#?}", query_clone);
            let oracle_seeds;
            let postgres_seeds;
            let mode = query_clone.mode();

            let db_param_iter_ret = match query_clone.db_type() {
                super::sql_common::DBType::Oracle => {
                    match QueryScanner::map_oracle_param_seeds(
                        schema_clone.clone(),
                        query_clone.as_ref(),
                    ) {
                        Ok(os) => {
                            if os.is_empty() {
                                Ok(DBParamIter::Oracle(None))
                            } else {
                                oracle_seeds = os;
                                let params_iter = ParameterIterator::new(&oracle_seeds, &mode);
                                Ok(DBParamIter::Oracle(Some(RefCell::new(params_iter))))
                            }
                        }
                        Err(err) => Err(SQLError::new(err.to_string())),
                    }
                }
                super::sql_common::DBType::Postgres => {
                    match QueryScanner::map_postgres_param_seeds(
                        schema_clone.clone(),
                        query_clone.as_ref(),
                    ) {
                        Ok(ps) => {
                            if ps.is_empty() {
                                Ok(DBParamIter::Postgres(None))
                            } else {
                                postgres_seeds = ps;
                                let params_iter = ParameterIterator::new(&postgres_seeds, &mode);
                                Ok(DBParamIter::Postgres(Some(RefCell::new(params_iter))))
                            }
                        }
                        Err(err) => Err(SQLError::new(err.to_string())),
                    }
                }
            };

            let db_param_iter = match db_param_iter_ret {
                Ok(dpi) => {
                    log::debug!("mapped params iterator.");
                    dpi
                }
                Err(err) => {
                    log::debug!("map params iterator failed: {}", err);
                    tx.send((i, Err(err), None, 0, 0));
                    return;
                }
            };

            let mut query_scanner =
                QueryScanner::new(schema_clone.clone(), query_clone.as_ref(), db_param_iter)
                    .unwrap();
            while !stop.load(Ordering::Acquire) {
                log::debug!(
                    "scan params, finished: {}, total: {}, drained: {}",
                    query_scanner.finished(),
                    query_scanner.total(),
                    query_scanner.drained()
                );
                match query_scanner.next() {
                    Some(rs) => {
                        let messge = (
                            i,
                            rs,
                            query_scanner.current_params(),
                            query_scanner.finished(),
                            query_scanner.total(),
                        );
                        if !stop.load(Ordering::Acquire) {
                            tx.send(messge).unwrap();
                        }
                    }
                    None => break,
                }
            }

            log::debug!("finished scan query: {:#?}", queries_clone);
        });
    }

    let mut query_results = Vec::with_capacity(queries.len());
    for _ in 0..queries.len() {
        query_results.push(None);
    }

    for (i, rs, cur_params, finished, total) in receiver {
        log::debug!("receive message.");
        let sql_result = match rs {
            Ok(rs) => SQLResult::new_result(Some(rs)),
            Err(err) => {
                stop.store(true, Ordering::Release);
                SQLResult::new_error(err)
            }
        };

        let scan_result = ResultPerSchema::new(
            schema.clone(),
            cur_params,
            Some(sql_result),
            finished,
            total,
        );
        query_results[i] = Some(scan_result);
        if stop.load(Ordering::Acquire) {
            break;
        }
        if query_results.iter().all(|qr| qr.is_some()) {
            break;
        }
    }

    log::debug!("finish schema queries scan {:#?}", query_results);

    query_results
}
