mod rocksdb_handler;
mod oracle_handler;
use serde::Deserialize;
use crate::cmd::Cmd::*;
use tauri::Webview;

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
  }
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
      }
      Ok(())
    }
  }
}
