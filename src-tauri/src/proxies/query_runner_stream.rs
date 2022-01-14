use anyhow::Result;
use std::{
    cell::RefCell,
    collections::{HashMap, LinkedList},
    sync::{atomic::AtomicBool, Arc},
    time::{Duration, Instant},
};

use async_graphql::SimpleObject;
use serde_json::Value;
use tokio::sync::mpsc::Sender;

use crate::{
    core::{
        parameter_iterator::{DBParamIter, ParamSeeds, ParameterIterator},
        query_scanner::QueryScanner,
    },
    handlers::query_runner::Query,
};

use oracle::sql_type::ToSql as OracleToSql;
use tokio_postgres::types::ToSql as PgToSql;

use super::sql_common::{DBType, SQLError, SQLResultSet};

pub enum ScanMessage {
    StartExecution {
        index: usize,
        params: Option<Vec<Value>>,
        total: usize,
    },
    FinishExecution {
        index: usize,
        params: Option<Vec<Value>>,
        total: usize,
        result: Result<SQLResultSet, SQLError>,
        elapsed: Duration,
    },
}

#[derive(SimpleObject)]
pub struct QueryRunnerMessage {
    schema: String,
    index: usize,
    parameters: Option<Vec<Value>>,
    finished: usize,
    pending: usize,
    total: usize,
}

pub async fn scan_queries_stream(
    mut schema_queries: HashMap<String, Vec<Query>>,
    diff_results: bool,
) -> impl futures::stream::Stream<Item = QueryRunnerMessage> {
    let (msg_tx, mut msg_rx) = tokio::sync::mpsc::channel::<QueryRunnerMessage>(16);

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
    let _stop = Arc::new(AtomicBool::new(false));
    let _query_results: Vec<LinkedList<bool>> = vec![LinkedList::new(); queries.len()];
    let _final_results: Vec<Option<bool>> = vec![None; queries.len()];
    let mut query_index = 0;
    for query in queries.drain(..) {
        let schema_clone = schema.clone();
        let msg_tx_clone = msg_tx.clone();
        let scan_tx_clone = scan_tx.clone();

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
        query_index += 1;
    }

    tokio::spawn(async move {
        while let Some(scan_msg) = scan_rx.recv().await {
            match scan_msg {
                ScanMessage::StartExecution {
                    index,
                    params,
                    total,
                } => {
                    let msg = QueryRunnerMessage {
                        schema: schema.clone(),
                        index,
                        parameters: params,
                        finished: 0,
                        pending: 1,
                        total,
                    };
                    msg_tx.send(msg).await;
                }
                ScanMessage::FinishExecution {
                    index,
                    params,
                    total,
                    result: _,
                    elapsed: _,
                } => {
                    let msg = QueryRunnerMessage {
                        schema: schema.clone(),
                        index,
                        parameters: params,
                        finished: 1,
                        pending: 0,
                        total,
                    };
                    msg_tx.send(msg).await;
                }
            }
        }
    });
    todo!()
}

pub async fn scan_schema_query<'a>(
    index: usize,
    schema: String,
    query: Query,
    _msg_tx: Sender<QueryRunnerMessage>,
    scan_tx: Sender<ScanMessage>,
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
            index,
            params: cur_params.clone(),
            total: query_scanner.total(),
        };
        scan_tx.send(start_msg);
        let execution_start = Instant::now();

        match query_scanner.next() {
            Some(rs) => {
                let elapsed = execution_start.elapsed();
                let finish_msg = ScanMessage::FinishExecution {
                    index,
                    params: cur_params,
                    total: query_scanner.total(),
                    result: rs,
                    elapsed: elapsed,
                };
                scan_tx.send(finish_msg);
            }
            None => {
                log::debug!("Got nothing from query scanner, stop it");
                break;
            }
        }
    }
}
