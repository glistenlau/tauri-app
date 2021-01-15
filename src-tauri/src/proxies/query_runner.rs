use std::{
    cell::RefCell,
    collections::{HashMap, LinkedList},
    sync::Arc,
    sync::atomic::AtomicBool,
    sync::atomic::Ordering,
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};

use anyhow::Result;
use oracle::sql_type::ToSql as OracleToSql;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio_postgres::types::ToSql as PgToSql;

use crate::{
    core::{
        parameter_iterator::ParamSeeds,
        query_scanner::QueryScanner,
        result_diff::{diff, DiffResults},
    },
    core::parameter_iterator::DBParamIter,
    core::parameter_iterator::ParameterIterator,
    handlers::query_runner::Query,
};

use super::sql_common::{SQLError, SQLResult, SQLResultSet};

#[derive(Clone, Serialize, Debug)]
pub struct ProgressMessage<'a> {
    schema: &'a str,
    index: usize,
    parameters: Option<&'a [Value]>,
    finished: usize,
    pending: usize,
    total: usize,
}

impl<'a> ProgressMessage<'a> {
    pub fn new(
        schema: &'a str,
        index: usize,
        parameters: Option<&'a [Value]>,
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

#[derive(Debug)]
enum Message {
    FinishQuery(
        usize,
        Result<SQLResultSet, SQLError>,
        Option<Vec<Value>>,
        usize,
        Duration,
    ),
    StartQuery(usize, Option<Vec<Value>>, usize),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QueryResultPerSchema {
    progress: ProgressInfo,
    parameters: Option<Vec<Value>>,
    results: Option<SQLResult>,
}

impl QueryResultPerSchema {
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
#[serde(rename_all = "camelCase")]
pub struct ResultPerSchema {
    query_results: Vec<Option<QueryResultPerSchema>>,
    diff_results: Option<DiffResults>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RunResults {
    #[serde(flatten)]
    results: HashMap<String, ResultPerSchema>,
}

pub fn scan_queries(schema_queries: HashMap<String, Vec<Query>>, diff_results: bool) -> RunResults {
    let mut results = HashMap::with_capacity(schema_queries.len());
    let mut schema_join_handlers = HashMap::with_capacity(schema_queries.len());
    for (schema, queries) in schema_queries {
        let queries_arc = queries.iter().map(|q| Arc::new(q.clone())).collect();
        schema_join_handlers.insert(
            schema.clone(),
            thread::spawn(move || scan_schema_queries(schema.clone(), queries_arc, diff_results)),
        );
    }

    for (schema, schema_join_handler) in schema_join_handlers {
        match schema_join_handler.join() {
            Ok(schema_result) => {
                results.insert(schema, schema_result);
            }
            Err(e) => {
                log::error!("schmea scan thead error: {:?}", e);
            }
        }
    }

    RunResults { results }
}

pub fn scan_schema_queries(
    schema: String,
    queries: Arc<[Arc<Query>]>,
    diff_results: bool,
) -> ResultPerSchema {
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
            let mode = query_clone.mode();
            let oracle_seeds: Vec<Vec<Box<dyn OracleToSql>>>;
            let postgres_seeds: Vec<Vec<Box<dyn PgToSql + Sync>>>;

            let param_seeds_ret = match query_clone.db_type() {
                super::sql_common::DBType::Oracle => {
                    QueryScanner::map_oracle_param_seeds(schema_clone.clone(), query_clone.as_ref())
                }
                super::sql_common::DBType::Postgres => QueryScanner::map_postgres_param_seeds(
                    schema_clone.clone(),
                    query_clone.as_ref(),
                ),
            };

            let mut query_scanner = match param_seeds_ret {
                Ok(ParamSeeds::Oracle(prepared_statement, seeds)) => {
                    oracle_seeds = seeds;
                    let params_iter =
                        ParameterIterator::new(&oracle_seeds, &mode, prepared_statement);
                    let db_param_iter = DBParamIter::Oracle(RefCell::new(params_iter));
                    QueryScanner::new(query_clone.as_ref(), db_param_iter)
                }
                Ok(ParamSeeds::Postgres(prepared_statement, seeds)) => {
                    postgres_seeds = seeds;
                    let params_iter =
                        ParameterIterator::new(&postgres_seeds, &mode, prepared_statement);
                    let db_param_iter = DBParamIter::Postgres(RefCell::new(params_iter));
                    QueryScanner::new(query_clone.as_ref(), db_param_iter)
                }
                Err(err) => {
                    log::error!("map params iterator failed: {}", err);
                    match tx.send(Message::FinishQuery(
                        i,
                        Err(SQLError::from(err)),
                        None,
                        0,
                        Duration::default(),
                    )) {
                        Ok(_) => {
                            log::debug!("send mag successfully.");
                        }
                        Err(e) => {
                            log::error!("failed to send msg: {}", e);
                        }
                    };
                    return;
                }
            };

            while !stop.load(Ordering::Acquire) {
                log::debug!(
                    "{} scan params, finished: {}, total: {}, drained: {}",
                    i,
                    query_scanner.finished(),
                    query_scanner.total(),
                    query_scanner.drained()
                );
                let cur_params = query_scanner.current_params();
                let start_msg = Message::StartQuery(i, cur_params.clone(), query_scanner.total());
                tx.send(start_msg).unwrap();
                let now = Instant::now();
                match query_scanner.next() {
                    Some(rs) => {
                        let elapsed = now.elapsed();
                        let messge =
                            Message::FinishQuery(i, rs, cur_params, query_scanner.total(), elapsed);
                        if !stop.load(Ordering::Acquire) {
                            tx.send(messge).unwrap();
                        }
                    }
                    None => {
                        log::debug!("got nothing from query scanner, stop the scanner.");
                        break;
                    }
                }
            }

            log::debug!("{} finished scan query.", i);
        });
    }

    let mut query_results = vec![LinkedList::new(); queries.len()];
    let mut final_results = vec![None; queries.len()];
    let mut progress_vec: Vec<Option<RefCell<ProgressInfo>>> = vec![None; queries.len()];
    let mut diff_rst = None;
    let mut has_error = false;

    fn update_and_emit_progress_vec(
        progress_vec: &mut Vec<Option<RefCell<ProgressInfo>>>,
        schema: &str,
        index: usize,
        pending_delta: isize,
        finished_delta: isize,
        total_delta: usize,
        elapsed: Option<Duration>,
        cur_params: Option<&[Value]>,
        notify_progress: bool,
    ) {
        match progress_vec.get(index).unwrap() {
            Some(progress) => {
                let mut progress_mut = progress.borrow_mut();
                progress_mut.finished =
                    ((progress_mut.finished as isize) + finished_delta) as usize;
                progress_mut.pending = ((progress_mut.pending as isize) + pending_delta) as usize;
                if elapsed.is_some() {
                    progress_mut.elapsed += elapsed.unwrap();
                }
            }
            None => {
                progress_vec[index] = Some(RefCell::new(ProgressInfo::new(
                    finished_delta as usize,
                    total_delta,
                    pending_delta as usize,
                    elapsed.unwrap_or(Duration::new(0, 0)),
                )));
            }
        };
        let progress = progress_vec[index].as_ref().unwrap().borrow();

        if notify_progress {
            emit_progress(
                schema,
                index,
                cur_params,
                progress.finished,
                progress.pending,
                progress.total,
            );
        }
    }

    for msg in receiver {
        log::debug!("receiver got msg: {:?}", msg);
        match msg {
            Message::FinishQuery(i, rs, cur_params, total, elapsed) => {
                let sql_result = match rs {
                    Ok(rs) => SQLResult::new_result(Some(rs)),
                    Err(err) => {
                        has_error = true;
                        SQLResult::new_error(err)
                    }
                };

                log::debug!("finished {} query for {}, cur_params: {:?}", i, schema, cur_params);

                let (pending_delta, finished_delta) = if diff_results { (0, 0) } else { (0, 1) };

                update_and_emit_progress_vec(
                    &mut progress_vec,
                    &schema,
                    i,
                    pending_delta,
                    finished_delta,
                    total,
                    Some(elapsed),
                    cur_params.as_deref(),
                    false,
                );

                let scan_result = (cur_params, sql_result);

                if !diff_results {
                    final_results[i] = Some(scan_result);
                } else {
                    query_results[i].push_back(scan_result);
                }
            }
            Message::StartQuery(i, cur_params, total) => update_and_emit_progress_vec(
                &mut progress_vec,
                &schema,
                i,
                1,
                0,
                total,
                None,
                cur_params.as_deref(),
                true,
            ),
        }

        if diff_results
            && query_results.iter().enumerate().all(|(index, q)| {
            q.len() > 0
                || progress_vec[index]
                .as_ref()
                .map_or(false, |p| p.borrow().finished == p.borrow().total)
        })
        {
            let mut first_results: Vec<Option<(Option<Vec<Value>>, SQLResult)>> =
                query_results.iter_mut().map(|qr| qr.pop_front()).collect();
            let first_results_rows: Vec<Option<&[Vec<Value>]>> = first_results
                .iter()
                .map(|fr| {
                    let (_, sql_result) = fr.as_ref().unwrap();
                    match sql_result {
                        SQLResult::Result(rs_opt) => match rs_opt {
                            Some(rs) => rs.rows().as_deref(),
                            None => None,
                        },
                        SQLResult::Error(_) => None,
                    }
                })
                .collect();

            diff_rst = diff(&first_results_rows);

            first_results
                .drain(..)
                .enumerate()
                .for_each(|(index, scan_result_opt)| {
                    match &scan_result_opt {
                        Some((cur_params, _)) => {
                            update_and_emit_progress_vec(
                                &mut progress_vec,
                                &schema,
                                index,
                                -1,
                                1,
                                0,
                                None,
                                cur_params.as_deref(),
                                false,
                            );
                        }
                        None => {}
                    }

                    final_results[index] = scan_result_opt;
                });
        }

        let all_finished = progress_vec.iter().all(|p| {
            p.as_ref().map_or(false, |p| {
                let p_ref = p.borrow();
                if p_ref.total == p_ref.finished {
                    return true;
                }
                false
            })
        });
        let all_have_result = final_results.iter().all(|fr| fr.as_ref().is_some());

        if all_finished || (has_error && all_have_result) || diff_rst.is_some() {
            log::debug!("about to finish scan, all finished: {}, has_error: {}, all have result: {}, diff rst: {:?}", all_finished, has_error, all_have_result, diff_rst);
            stop.store(true, Ordering::Release);
        }

        if stop.load(Ordering::Acquire) {
            break;
        }
    }

    log::debug!("finish schema queries scan.");

    let rst = final_results
        .drain(..)
        .enumerate()
        .map(|(i, fr_opt)| match fr_opt {
            Some((params, result)) => {
                let progress = progress_vec[i].as_ref().unwrap().borrow();
                let finished = progress.finished;
                let pending = progress.pending;
                let total = progress.total;
                let elapsed = progress.elapsed;

                Some(QueryResultPerSchema::new(
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
        .collect();

    let schema_result = ResultPerSchema {
        query_results: rst,
        diff_results: diff_rst,
    };
    emit_schema_result(&schema, &schema_result);

    schema_result
}

fn emit_progress(
    schema: &str,
    index: usize,
    cur_params: Option<&[Value]>,
    finished: usize,
    pending: usize,
    total: usize,
) {
    let emitter_lock = crate::event::get_emitter();
    let mut emitter = emitter_lock.lock().unwrap();
    emitter.emit(
        "scan_query_progress",
        Some(ProgressMessage::new(
            schema, index, cur_params, finished, pending, total,
        )),
    );
}

fn emit_schema_result(schema: &str, result: &ResultPerSchema) {
    let emitter_lock = crate::event::get_emitter();
    let mut emitter = emitter_lock.lock().unwrap();
    emitter.emit("scan_query_schema_result", Some((schema, result)));
}
