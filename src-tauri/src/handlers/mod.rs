pub mod fs;
pub mod rocksdb;
pub mod sql;
pub mod log;

use crate::proxies;
use std::time::Duration;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tauri::{execute_promise, Webview};

#[derive(Deserialize, Debug)]
pub struct Endpoint<A, P> {
    pub action: A,
    pub payload: P,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "name", rename_all = "camelCase")]
pub enum Handler {
    Oracle(Endpoint<sql::Action, sql::Payload>),
    Postgres(Endpoint<sql::Action, sql::Payload>),
    RocksDB(Endpoint<rocksdb::Action, rocksdb::Payload>),
    File(Endpoint<fs::Action, fs::Payload>),
    Log(Endpoint<log::Action, log::Payload>),
}

#[derive(Serialize, Deserialize)]
pub struct ResponseError {
  message: String,
}

impl ResponseError {
  pub fn new(message: String) -> ResponseError {
    ResponseError {
      message
    }
  }
}

#[derive(Serialize, Deserialize)]
pub enum ResponseResult<T> {
  Result(T),
  Error(ResponseError),
}

impl <T> ResponseResult<T> {
    fn new_result(result: T) -> ResponseResult<T>{
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

impl <T>Response<T> {
    fn new(success: bool, elapsed: Duration, result: ResponseResult<T>) -> Response<T> {
        Response {
            success,
            elapsed,
            result,
        }
    }
}

pub fn seralizeResponse<T: Serialize>(rsp_obj: T) -> Result<String> {
    match serde_json::to_string(&rsp_obj) {
        Ok(seralized) => Ok(seralized),
        Err(e) => Err(anyhow!("Seralize response error: {}", e)),
    }
}

pub fn dispath_async(_webview: &mut Webview, handler: Handler, callback: String, error: String) {
    execute_promise(_webview, move || invoke_handler(handler), callback, error);
}

fn invoke_handler(handler: Handler) -> Result<String> {
    match handler {
        Handler::Oracle(e) => seralizeResponse(sql::handle_command(
            e.action,
            e.payload,
            proxies::oracle::get_proxy(),
        )?),
        Handler::Postgres(e) => seralizeResponse(sql::handle_command(
            e.action,
            e.payload,
            proxies::postgres::get_proxy(),
        )?),
        Handler::RocksDB(e) => seralizeResponse(rocksdb::handle_command(e.action, e.payload)?),
        Handler::File(e) => seralizeResponse(fs::handle_command(e)),
        Handler::Log(e) => seralizeResponse(log::handle_command(e)),
    }
}
