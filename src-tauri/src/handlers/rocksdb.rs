use crate::proxies::rocksdb;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
  Delete,
  Get,
  Put,
}

#[derive(Deserialize)]
pub struct Payload {
  key: String,
  val: Option<String>,
}

#[derive(Serialize)]
pub struct Response {
  success: bool,
  value: Option<String>,
}

impl Response {
  fn new(success: bool, value: Option<String>) -> Response {
    Response {
      success,
      value,
    }
  }
}

pub fn handle_command(action: Action, payload: Payload) -> Result<Response> {
  let (key, val) = (payload.key, payload.val);
  let mut value= None;

  match action{
    Action::Get => value = execute_get(key)?,
    Action::Put => execte_put(key, val)?,
    Action::Delete => execute_delete(key)?,
  }

  Ok(Response::new(true, value))
}

fn execute_get(key: String) -> Result<Option<String>> {
  let data_store = rocksdb::get_proxy();
  match data_store.get(key.as_str()) {
    Ok(Some(str_vals)) => Ok(Some(String::from_utf8(str_vals)?)),
    Ok(None) => Ok(None),
    Err(e) => Err(anyhow!("RocksDB get error: {}", e)),
  }
}

fn execte_put(key: String, val: Option<String>) -> Result<()> {
  let data_store = rocksdb::get_proxy();
  if val.is_none() {
    return Err(anyhow!("RocksDB put miss value."));
  }

  match data_store.put(key.as_str(), val.unwrap().as_str()) {
    Ok(()) => Ok(()),
    Err(e) => Err(anyhow!("RocksDB put error: {}", e)),
  }
}

fn execute_delete(key: String) -> Result<()> {
  let data_store = rocksdb::get_proxy();
  match data_store.delete(key.as_str()) {
    Ok(()) => Ok(()),
    Err(e) => Err(anyhow!("RocksDB delete error: {}", e)),
  }
}
