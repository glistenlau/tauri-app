use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tauri::{execute_promise, Webview};

use crate::proxies;

pub mod formatter;
pub mod fs;
pub mod graphql;
pub mod java_props;
pub mod log;
pub mod query_runner;
pub mod rocksdb;
pub mod sql;

#[derive(Deserialize, Debug)]
pub struct Endpoint<A, P> {
    pub action: A,
    pub payload: P,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "name", rename_all = "camelCase")]
pub enum Handler {
    Oracle(Endpoint<sql::Action, sql::Payload<proxies::oracle::OracleConfig>>),
    Postgres(Endpoint<sql::Action, sql::Payload<proxies::postgres::ConnectionConfig>>),
    QueryRunner(Endpoint<query_runner::Action, query_runner::Payload>),
    RocksDB(Endpoint<rocksdb::Action, rocksdb::Payload>),
    File(Endpoint<fs::Action, fs::Payload>),
    Formatter(Endpoint<formatter::Action, formatter::Payload>),
    Log(Endpoint<log::Action, log::Payload>),
    JavaProps(Endpoint<java_props::Action, java_props::Payload>),
    GraphQL(Endpoint<graphql::Action, graphql::Payload>),
}

#[derive(Serialize, Deserialize)]
pub struct ResponseError {
    message: String,
}

impl ResponseError {
    pub fn new(message: String) -> ResponseError {
        ResponseError { message }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum ResponseResult<T> {
    Result(T),
    Error(ResponseError),
}

impl<T> ResponseResult<T> {
    fn new_result(result: T) -> ResponseResult<T> {
        ResponseResult::Result(result)
    }

    fn new_error(error: ResponseError) -> ResponseResult<T> {
        ResponseResult::Error(error)
    }
}

#[derive(Serialize, Deserialize)]
pub struct Response<T> {
    success: bool,
    elapsed: Duration,
    result: ResponseResult<T>,
}

impl<T> Response<T> {
    fn new(success: bool, elapsed: Duration, result: ResponseResult<T>) -> Response<T> {
        Response {
            success,
            elapsed,
            result,
        }
    }
}

pub fn seralize_response<T: Serialize>(rsp_obj: T) -> Result<String> {
    match serde_json::to_string(&rsp_obj) {
        Ok(seralized) => Ok(seralized),
        Err(e) => Err(anyhow!("Seralize response error: {}", e)),
    }
}

pub fn generate_response<T: Serialize>(res: Result<T>, elapsed: Duration) -> Result<String> {
    let rsp: Response<T> = match res {
        Ok(r) => Response::new(true, elapsed, ResponseResult::new_result(r)),
        Err(e) => Response::new(
            false,
            elapsed,
            ResponseResult::new_error(ResponseError::new(e.to_string())),
        ),
    };

    match serde_json::to_string(&rsp) {
        Ok(seralized) => Ok(seralized),
        Err(e) => Err(anyhow!("Seralize response error: {}", e)),
    }
}

pub fn dispath_async(_webview: &mut Webview, handler: Handler, callback: String, error: String) {
    execute_promise(_webview, move || invoke_handler(handler), callback, error);
}

fn invoke_handler(handler: Handler) -> Result<String> {
    let now = Instant::now();
    match handler {
        Handler::Oracle(e) => generate_response(
            sql::handle_command(e.action, e.payload, proxies::oracle::get_proxy()),
            now.elapsed(),
        ),
        Handler::Postgres(e) => generate_response(
            sql::handle_command(e.action, e.payload, proxies::postgres::get_proxy()),
            now.elapsed(),
        ),
        Handler::RocksDB(e) => seralize_response(rocksdb::handle_command(e.action, e.payload)?),
        Handler::File(e) => seralize_response(fs::handle_command(e)),
        Handler::Log(e) => seralize_response(log::handle_command(e)),
        Handler::JavaProps(e) => generate_response(java_props::handle_command(e), now.elapsed()),
        Handler::QueryRunner(e) => generate_response(
            query_runner::handle_command(e.action, e.payload),
            now.elapsed(),
        ),
        Handler::Formatter(e) => seralize_response(formatter::handle_command(e)),
        Handler::GraphQL(e) => graphql::handle_command(e),
    }
}
