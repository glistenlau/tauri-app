pub mod oracle;
pub mod rocksdb;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Webview, execute_promise};

#[derive(Deserialize)]
pub struct Endpont<A, P> {
  pub action: A,
  pub payload: P,
}

#[derive(Deserialize)]
#[serde(tag = "name", rename_all = "camelCase")]
pub enum Handler {
  Oracle(Endpont<oracle::Action, oracle::Payload>),
  RocksDB(Endpont<rocksdb::Action, rocksdb::Payload>)
}

#[derive(Serialize)]
pub struct Response<P> {
  payload: P,
}

pub fn dispath_async(_webview: &mut Webview, handler:Handler, callback: String, error: String) {
  match handler {
    Handler::Oracle(endpoint) => {
      execute_promise(_webview,
        move || oracle::handle_command(endpoint.action, endpoint.payload), 
        callback, 
        error)
    },
    Handler::RocksDB(endpoint) => {
      execute_promise(_webview,
        move || rocksdb::handle_command(endpoint.action, endpoint.payload), 
        callback, 
        error)
    }  
  }
}