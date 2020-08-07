use crate::proxies::rocksdb_proxy;
use anyhow::{anyhow, Result};

pub fn handle_command(action: String, key: String, val: Option<String>) -> Result<String> {
  match action.as_str() {
    "get" => execute_get(key),
    "put" => execte_put(key, val),
    "delete" => execute_delete(key),
    _ => Err(anyhow!("Invalid RocksDB action: {}", action)),
  }
}

fn execute_get(key: String) -> Result<String> {
  let data_store = rocksdb_proxy::get_proxy();
  match data_store.get(key.as_str()) {
    Ok(Some(str_vals)) => Ok(String::from_utf8(str_vals)?),
    Ok(None) => Ok("".to_string()),
    Err(e) => Err(anyhow!("RocksDB get error: {}", e)),
  }
}

fn execte_put(key: String, val: Option<String>) -> Result<String> {
  let data_store = rocksdb_proxy::get_proxy();
  if val.is_none() {
    return Err(anyhow!("RocksDB put miss value."));
  }

  match data_store.put(key.as_str(), val.unwrap().as_str()) {
    Ok(()) => Ok(String::default()),
    Err(e) => Err(anyhow!("RocksDB put error: {}", e)),
  }
}

fn execute_delete(key: String) -> Result<String> {
  let data_store = rocksdb_proxy::get_proxy();
  match data_store.delete(key.as_str()) {
    Ok(()) => Ok(String::default()),
    Err(e) => Err(anyhow!("RocksDB delete error: {}", e)),
  }
}
