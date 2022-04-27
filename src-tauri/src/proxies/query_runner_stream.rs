use anyhow::Result;
use std::{
    cell::RefCell,
    collections::{HashMap, LinkedList},
    sync::{
        atomic::{AtomicBool, AtomicUsize},
        Arc,
    },
    time::{Duration, Instant},
};

use async_graphql::SimpleObject;
use serde_json::Value;
use tokio::sync::mpsc::Sender;

use crate::{
    core::{
        parameter_iterator::{DBParamIter, ParamSeeds, ParameterIterator},
        query_scanner::QueryScanner,
        result_diff::diff,
    },
    handlers::query_runner::Query,
};

use oracle::sql_type::ToSql as OracleToSql;
use tokio_postgres::types::ToSql as PgToSql;

use super::{
    query_runner::ProgressInfo,
    sql_common::{DBType, SQLError, SQLResultSet, SQLResult},
};

static QUERY_RUNNER_CF: &str = "QUERY_RUNNER_CF";

#[derive(Debug)]
pub enum ScanMessage {
    StartExecution {
        msg_id: usize,
        index: usize,
        params: Option<Vec<Value>>,
        total: usize,
    },
    FinishExecution {
        msg_id: usize,
        index: usize,
        params: Option<Vec<Value>>,
        total: usize,
        result: Result<SQLResultSet, SQLError>,
        elapsed: Duration,
    },
}

#[derive(SimpleObject)]
struct ScanResults {
    has_error: bool,
    results: Option<SQLResultSet>,
    error_msg: Option<String>,
}

#[derive(SimpleObject)]
pub struct QueryRunnerMessage {
    msg_id: usize,
    schema: String,
    index: usize,
    parameters: Option<Vec<Value>>,
    finished: usize,
    pending: usize,
    total: usize,
    scan_results: Option<ScanResults>,
}

static MSG_COUNTER: AtomicUsize = AtomicUsize::new(0);

pub async fn scan_queries_stream(
    mut schema_queries: HashMap<String, Vec<Query>>,
    diff_results: bool,
) -> impl futures::stream::Stream<Item = QueryRunnerMessage> {
    let (msg_tx, mut msg_rx) = tokio::sync::mpsc::channel::<QueryRunnerMessage>(16);
    MSG_COUNTER.store(0, std::sync::atomic::Ordering::SeqCst);

    for (schema, queries) in schema_queries.drain() {
        let msg_tx_clone = msg_tx.clone();
        let _join_handle = tokio::spawn(async move {
            scan_schema_queries(schema.clone(), queries, diff_results, true, msg_tx_clone).await;
        });
    }

    async_stream::stream! {
        while let Some(item) = msg_rx.recv().await {
            yield item;
        }
    }
}

pub async fn scan_schema_queries(
    schema: String,
    mut queries: Vec<Query>,
    _diff_results: bool,
    _sort: bool,
    msg_tx: Sender<QueryRunnerMessage>,
) {
    let (scan_tx, mut scan_rx) = tokio::sync::mpsc::channel::<ScanMessage>(16);
    let query_len = queries.len();
    let _stop = Arc::new(AtomicBool::new(false));
    let _query_results: Vec<LinkedList<bool>> = vec![LinkedList::new(); queries.len()];
    let _final_results: Vec<Option<bool>> = vec![None; queries.len()];
    let mut progress: Vec<RefCell<ProgressInfo>> = Vec::with_capacity(queries.len());
    for (query_index, query) in queries.drain(..).enumerate() {
        let schema_clone = schema.clone();
        let msg_tx_clone = msg_tx.clone();
        let scan_tx_clone = scan_tx.clone();

        progress.push(RefCell::new(ProgressInfo::new(
            0,
            0,
            0,
            Duration::new(0, 0),
        )));

        tokio::spawn(async move {
            scan_schema_query(
                query_index,
                schema_clone,
                query,
                msg_tx_clone,
                scan_tx_clone,
            )
            .await;
        });
    }

    tokio::spawn(async move {
        let mut query_results: Vec<LinkedList<SQLResultSet>> =
            vec![LinkedList::new(); query_len];


        while let Some(scan_msg) = scan_rx.recv().await {
            log::debug!("Got scan msg: {:?}", &scan_msg);
            match scan_msg {
                ScanMessage::StartExecution {
                    msg_id,
                    index,
                    params,
                    total,
                } => {
                    let mut prgs = progress[index].borrow_mut();
                    update_progress_info(&mut prgs, 0, 1, total, Duration::ZERO);
                    send_progress_message(
                        schema.clone(),
                        msg_id,
                        index,
                        params,
                        &prgs,
                        msg_tx.clone(),
                    );
                }
                ScanMessage::FinishExecution {
                    msg_id,
                    index,
                    params,
                    total,
                    result,
                    elapsed: _,
                } => {
                    let mut prgs = progress[index].borrow_mut();
                    update_progress_info(&mut prgs, 1, -1, total, Duration::ZERO);
                    send_progress_message(
                        schema.clone(),
                        msg_id,
                        index,
                        params,
                        &prgs,
                        msg_tx.clone(),
                    );

                    match result {
                        Ok(rs) => {
                            let rs_list = query_results.get_mut(index).unwrap();
                            rs_list.push_back(rs);
                        }
                        Err(_e) => {
                            log::debug!("sql error.")
                        }
                    }

                    let ready_to_diff = query_results.iter().all(|ll| !ll.is_empty());
                    if ready_to_diff {
                        let first_results: Vec<Option<SQLResultSet>> =
                            query_results.iter_mut().map(|qr| qr.pop_front()).collect();

                        let first_results_rows: Vec<Option<&[Vec<Value>]>> = first_results
                            .iter()
                            .map(|fr| {
                                let sql_result = fr.as_ref().unwrap();
                                sql_result.get_rows().as_deref()
                            })
                            .collect();

                        let diff_rst = diff(&first_results_rows);

                        match diff_rst {
                            Some(diff_map) => log::debug!("Found diff: {:?}", diff_map),
                            None => log::debug!("Not found diff for schema: {}", &schema),
                        }
                    }
                }
            }
        }
    });
}

pub fn send_progress_message(
    schema: String,
    msg_id: usize,
    index: usize,
    params: Option<Vec<Value>>,
    prgs: &ProgressInfo,
    msg_tx: Sender<QueryRunnerMessage>,
) {
    let msg = QueryRunnerMessage {
        msg_id,
        schema,
        index,
        parameters: params,
        finished: prgs.finished,
        pending: prgs.pending,
        total: prgs.total,
        scan_results: None,
    };
    tokio::spawn(async move {
        msg_tx.send(msg).await;
    });
}

pub fn update_progress_info(
    progress: &mut ProgressInfo,
    finished_delta: isize,
    pendding_delta: isize,
    total: usize,
    elapsed_delta: Duration,
) {
    progress.finished += finished_delta as usize;
    if pendding_delta < 0 {
        progress.pending -= pendding_delta.abs() as usize;
    } else {
        progress.pending += pendding_delta as usize;
    }
    progress.total = total;
    progress.elapsed += elapsed_delta;
}

pub async fn scan_schema_query<'a>(
    index: usize,
    schema: String,
    query: Query,
    _msg_tx: Sender<QueryRunnerMessage>,
    mut scan_tx: Sender<ScanMessage>,
) {
    let param_seeds_ret = match query.db_type() {
        DBType::Oracle => QueryScanner::map_oracle_param_seeds(schema.clone(), &query),
        DBType::Postgres => QueryScanner::map_postgres_param_seeds(schema.clone(), &query).await,
    };

    let oracle_seeds: Vec<Vec<Box<dyn OracleToSql>>>;
    let postgres_seeds: Vec<Vec<Box<dyn PgToSql + Sync>>>;

    let mut query_scanner = match param_seeds_ret {
        Ok(ParamSeeds::Oracle(prepared_statement, seeds)) => {
            oracle_seeds = seeds;
            let params_iter =
                ParameterIterator::new(&oracle_seeds, query.mode(), prepared_statement);
            let db_param_iter = DBParamIter::Oracle(RefCell::new(params_iter));
            QueryScanner::new(&query, db_param_iter)
        }
        Ok(ParamSeeds::Postgres(prepared_statement, seeds)) => {
            postgres_seeds = seeds;
            let params_iter =
                ParameterIterator::new(&postgres_seeds, query.mode(), prepared_statement);
            let db_param_iter = DBParamIter::Postgres(RefCell::new(params_iter));
            QueryScanner::new(&query, db_param_iter)
        }
        Err(err) => {
            log::debug!("Map param seeds error: {}", err);
            return;
        }
    };

    loop {
        log::debug!(
            "{} scan params, finished: {}, total: {}, drained: {}",
            index,
            query_scanner.finished(),
            query_scanner.total(),
            query_scanner.drained()
        );

        let cur_params = query_scanner.current_params();
        let start_msg = ScanMessage::StartExecution {
            msg_id: MSG_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst),
            index,
            params: cur_params.clone(),
            total: query_scanner.total(),
        };
        scan_tx = send_scan_msg(scan_tx, start_msg);

        let execution_start = Instant::now();

        match query_scanner.next() {
            Some(rs) => {
                let elapsed = execution_start.elapsed();
                let finish_msg = ScanMessage::FinishExecution {
                    msg_id: MSG_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst),
                    index,
                    params: cur_params,
                    total: query_scanner.total(),
                    result: rs,
                    elapsed,
                };
                scan_tx = send_scan_msg(scan_tx, finish_msg);
            }
            None => {
                log::debug!("Got nothing from query scanner, stop it");
                break;
            }
        }
    }
}

fn send_scan_msg(scan_tx: Sender<ScanMessage>, msg: ScanMessage) -> Sender<ScanMessage> {
    let scan_tx_clone = scan_tx.clone();
    tokio::spawn(async move {
        log::debug!("Sending scan msg: {:?}", &msg);
        scan_tx_clone.send(msg).await;
    });
    scan_tx
}
