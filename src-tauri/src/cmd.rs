use crate::cmd::Cmd::*;
use serde::Deserialize;
use tauri::Webview;
use crate::handlers::{oracle_handler, rocksdb_handler};

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
  // your custom commands
  // multiple arguments are allowed
  // note that rename_all = "camelCase": you need to use "myCustomCommand" on JS
  ExecuteRocksDB {
    action: String,
    key: String,
    val: Option<String>,
    callback: String,
    error: String,
  },
  ExecuteOracle {
    action: oracle_handler::Action,
    payload: Option<oracle_handler::Payload>,
    callback: String,
    error: String,
  },
}

pub fn dispatch_command(_webview: &mut Webview, arg: &str) -> Result<(), String> {
  match serde_json::from_str(arg) {
    Err(e) => Err(e.to_string()),
    Ok(command) => {
      match command {
        ExecuteRocksDB {
          action,
          key,
          val,
          callback,
          error,
        } => tauri::execute_promise(
          _webview,
          move || rocksdb_handler::handle_command(action, key, val),
          callback,
          error,
        ),
        ExecuteOracle {
          action,
          payload,
          callback,
          error,
        } => tauri::execute_promise(
          _webview, 
          move || oracle_handler::handle_command(action, payload), 
          callback, 
          error),
      }
      Ok(())
    }
  }
}
