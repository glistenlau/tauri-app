pub mod oracle;
pub mod postgres;
pub mod rocksdb;

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use tauri::{execute_promise, Webview};

#[derive(Deserialize)]
pub struct Endpont<A, P> {
  pub action: A,
  pub payload: P,
}

#[derive(Deserialize)]
#[serde(tag = "name", rename_all = "camelCase")]
pub enum Handler {
  Oracle(Endpont<oracle::Action, oracle::Payload>),
  Postgres(Endpont<postgres::Action, postgres::Payload>),
  RocksDB(Endpont<rocksdb::Action, rocksdb::Payload>),
}

#[derive(Serialize)]
pub struct Response<P> {
  payload: P,
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
    Handler::Oracle(e) => seralizeResponse(oracle::handle_command(e.action, e.payload)?),
    Handler::Postgres(e) => seralizeResponse(postgres::handle_command(e.action, e.payload)?),
    Handler::RocksDB(e) => seralizeResponse(rocksdb::handle_command(e.action, e.payload)?),
  }
}
