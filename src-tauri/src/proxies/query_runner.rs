use std::{
    cell::RefCell,
    collections::HashMap,
    sync::atomic::AtomicBool,
    sync::atomic::Ordering,
    sync::mpsc,
    sync::Arc,
    thread,
    time::{self, Duration, Instant},
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::sql_common::{SQLError, SQLResult, SQLResultSet};
use crate::{
    core::parameter_iterator::DBParamIter, core::parameter_iterator::ParameterIterator,
    core::query_scanner::QueryScanner, handlers::query_runner::Query,
};
use anyhow::Result;

#[derive(Clone, Serialize, Debug)]
pub struct ProgressMessage<'a> {
    schema: &'a str,
    index: usize,
    parameters: Option<&'a Vec<Value>>,
    finished: usize,
    pending: usize,
    total: usize,
}

impl<'a> ProgressMessage<'a> {
    pub fn new(
        schema: &'a str,
        index: usize,
        parameters: Option<&'a Vec<Value>>,
        finished: usize,
        pending: usize,
        total: usize,
    ) -> Self {
        Self {
            schema,
            index,
            parameters,
            finished,
            pending,
            total,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ProgressInfo {
    finished: usize,
    total: usize,
    pending: usize,
    elapsed: Duration,
}

impl ProgressInfo {
    pub fn new(finished: usize, total: usize, pending: usize, elapsed: Duration) -> Self {
        Self {
            finished,
            total,
            pending,
            elapsed,
        }
    }
}

enum Message {
    FinishQuery(
        usize,
        Result<SQLResultSet, SQLError>,
        Option<Vec<Value>>,
        usize,
        Duration,
    ),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ResultPerSchema {
    progress: ProgressInfo,
    parameters: Option<Vec<Value>>,
    results: Option<SQLResult>,
}

impl ResultPerSchema {
    pub fn new(
        parameters: Option<Vec<Value>>,
        results: Option<SQLResult>,
        finished: usize,
        pending: usize,
        total: usize,
        elapsed: Duration,
    ) -> Self {
        Self {
            progress: ProgressInfo::new(finished, total, pending, elapsed),
            parameters,
            results,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RunResults {
    #[serde(flatten)]
    results: HashMap<String, Vec<Option<ResultPerSchema>>>,
}

pub fn scan_queries(schemas: Vec<String>, queries: Vec<Query>, diff_results: bool) -> RunResults {
    let mut results = HashMap::with_capacity(schemas.len());
    for schema in schemas {
        let queries_arc = queries.iter().map(|q| Arc::new(q.clone())).collect();
        let schema_result = scan_schema_queries(schema.clone(), queries_arc, diff_results);
        results.insert(schema.clone(), schema_result);
    }

    RunResults { results }
}

pub fn scan_schema_queries(
    schema: String,
    queries: Arc<[Arc<Query>]>,
    diff_results: bool,
) -> Vec<Option<ResultPerSchema>> {
    let (sender, receiver) = mpsc::channel::<Message>();
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
                    tx.send(Message::FinishQuery(
                        i,
                        Err(err),
                        None,
                        0,
                        Duration::default(),
                    ));
                    return;
                }
            };

            let mut query_scanner =
                QueryScanner::new(schema_clone.clone(), query_clone.as_ref(), db_param_iter)
                    .unwrap();
            while !stop.load(Ordering::Acquire) {
                log::debug!(
                    "{} scan params, finished: {}, total: {}, drained: {}",
                    i,
                    query_scanner.finished(),
                    query_scanner.total(),
                    query_scanner.drained()
                );
                let now = Instant::now();
                match query_scanner.next() {
                    Some(rs) => {
                        let elapsed = now.elapsed();
                        let messge = Message::FinishQuery(
                            i,
                            rs,
                            query_scanner.current_params(),
                            query_scanner.total(),
                            elapsed,
                        );
                        if !stop.load(Ordering::Acquire) {
                            tx.send(messge).unwrap();
                        }
                    }
                    None => break,
                }
            }

            log::debug!("{} finished scan query.", i);
        });
    }

    let mut query_results = vec![vec![]; queries.len()];
    let mut final_results = vec![None; queries.len()];
    let mut progress_vec: Vec<Option<RefCell<ProgressInfo>>> = vec![None; queries.len()];

    for msg in receiver {
        match msg {
            Message::FinishQuery(i, rs, cur_params, total, elapsed) => {
                let sql_result = match rs {
                    Ok(rs) => SQLResult::new_result(Some(rs)),
                    Err(err) => {
                        stop.store(true, Ordering::Release);
                        SQLResult::new_error(err)
                    }
                };

                let (pending_delta, finished_delta) = if diff_results { (1, 0) } else { (0, 1) };

                match progress_vec.get(i).unwrap() {
                    Some(progress) => {
                        let mut progress_mut = progress.borrow_mut();
                        progress_mut.finished += finished_delta;
                        progress_mut.pending += pending_delta;
                        progress_mut.elapsed += elapsed;
                    }
                    None => {
                        progress_vec[i] = Some(RefCell::new(ProgressInfo::new(
                            finished_delta,
                            total,
                            pending_delta,
                            elapsed,
                        )));
                    }
                };
                let progress = progress_vec[i].as_ref().unwrap().borrow();
                emit_progress(
                    &schema,
                    i,
                    &cur_params,
                    progress.finished,
                    progress.pending,
                    progress.total,
                );

                let scan_result = (cur_params, sql_result);

                if !diff_results {
                    final_results[i] = Some(scan_result);
                } else {
                    query_results[i].push(scan_result);
                }
            }
        }
        log::debug!("receive message.");

        let all_finished = progress_vec.iter().all(|p| {
            p.as_ref().map_or(false, |p| {
                let p_ref = p.borrow();
                if p_ref.total == p_ref.finished {
                    if p_ref.pending != 0 {
                        panic!("shouldn't have pending when all finished...");
                    }

                    return true;
                }
                false
            })
        });

        if all_finished {
            stop.store(true, Ordering::Release);
        } else {
        }

        if stop.load(Ordering::Acquire) {
            break;
        }
    }

    log::debug!("finish schema queries scan.");

    final_results
        .drain(..)
        .enumerate()
        .map(|(i, fr_opt)| match fr_opt {
            Some((params, result)) => {
                let progress = progress_vec[i].as_ref().unwrap().borrow();
                let finished = progress.finished;
                let pending = progress.pending;
                let total = progress.total;
                let elapsed = progress.elapsed;

                Some(ResultPerSchema::new(
                    params,
                    Some(result),
                    finished,
                    pending,
                    total,
                    elapsed,
                ))
            }
            None => None,
        })
        .collect()
}

fn emit_progress(
    schema: &str,
    index: usize,
    cur_params: &Option<Vec<Value>>,
    finished: usize,
    pending: usize,
    total: usize,
) {
    let emitter_lock = crate::event::get_emitter();
    let mut emitter = emitter_lock.lock().unwrap();
    emitter.emit(
        "scan_query_progress",
        Some(ProgressMessage::new(schema, index, cur_params.as_ref(), finished, pending, total)),
    );
}
