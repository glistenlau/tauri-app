#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]
use anyhow::{anyhow};
mod cmd;
mod datastore;

fn main() {
  println!("Test Message in main");
  let ds = datastore::getinstance();
  match tauri::api::path::data_dir() {
    Some(path) => {println!("Data path: {}", path.to_str().unwrap())}
    None => {}
  }
  tauri::AppBuilder::new()
    .invoke_handler(move |_webview, arg| {
      use cmd::Cmd::*;
      match serde_json::from_str(arg) {
        Err(e) => {
          Err(e.to_string())
        }
        Ok(command) => {
          match command {
            // definitions for your custom commands from Cmd here
            MyCustomCommand { argument } => {
              //  your command code
              println!("{}", argument);
            },
            ExecuteDataStore {
              action,
              key,
              val,
              callback,
              error,
            } => {
              tauri::execute_promise(
                _webview, 
                move || {
                  match action.as_str() {
                    "get" => {
                      match ds.get(key.as_str()) {
                        Ok(Some(res_val)) => {
                          return Ok(String::from_utf8(res_val)?);
                        },
                        Ok(None) => {
                          return Err(anyhow!("There is no value for this key {}", key));
                        },
                        Err(e) => {
                          return Err(anyhow!("Something went wrong with the get operation: {}", e));
                        }
                      }
                    },
                    "put" => {
                      match val {
                        Some(val_str) => {
                          let res = ds.put(key.as_str(), val_str.as_str());
                          if res.is_err() {
                            return Err(anyhow!("Someting wrong with the put operation: {}", res.unwrap_err()));
                          }
                          Ok("".to_string())
                        },
                        None => {
                          return Err(anyhow!("Missing val for put operation"));
                        }
                      }
                    },
                    "delete" => {
                      let res = ds.delete(key.as_str());
                      if res.is_err() {
                        return Err(anyhow!("Something wrong with the delete operation: {}", res.unwrap_err()));
                      }
                      return Ok("".to_string());
                    }
                    _ => {
                      return Err(anyhow!("Invalid action"));
                    }
                  }
                }, callback, error)
            }
          }
          Ok(())
        }
      }
    })
    .build()
    .run();
}
