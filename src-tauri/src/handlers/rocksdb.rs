use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

use crate::proxies::{
    java_props::load_props,
    rocksdb::{get_proxy, RocksDataStore},
};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Delete,
    Get,
    Put,
}

#[derive(Deserialize, Debug)]
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
        Response { success, value }
    }
}

pub fn handle_command(action: Action, payload: Payload) -> Result<Response> {
    let (key, val) = (payload.key, payload.val);
    let mut value = None;

    match action {
        Action::Get => value = execute_get(key)?,
        Action::Put => execte_put(key, val)?,
        Action::Delete => execute_delete(key)?,
    }

    Ok(Response::new(true, value))
}

fn execute_get(key: String) -> Result<Option<String>> {
    let conn = get_proxy().lock().unwrap().get_conn()?;
    let conn_lock = conn.lock().unwrap();

    match RocksDataStore::get(key.as_str(), &conn_lock) {
        Ok(Some(str_vals)) => Ok(Some(String::from_utf8(str_vals)?)),
        Ok(None) => Ok(None),
        Err(e) => Err(anyhow!("RocksDB get error: {}", e)),
    }
}

fn execte_put(key: String, val: Option<String>) -> Result<()> {
    if val.is_none() {
        return Err(anyhow!("RocksDB put miss value."));
    }

    let conn = get_proxy().lock().unwrap().get_conn()?;
    let conn_lock = conn.lock().unwrap();
    let res = match RocksDataStore::put(key.as_str(), val.unwrap().as_str(), &conn_lock) {
        Ok(()) => Ok(()),
        Err(e) => Err(anyhow!("RocksDB put error: {}", e)),
    };

    res
}

fn execute_delete(key: String) -> Result<()> {
    let conn = get_proxy().lock().unwrap().get_conn()?;
    let conn_lock = conn.lock().unwrap();
    match RocksDataStore::delete(key.as_str(), &conn_lock) {
        Ok(()) => Ok(()),
        Err(e) => Err(anyhow!("RocksDB delete error: {}", e)),
    }
}
