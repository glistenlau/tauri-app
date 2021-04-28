use serde::Deserialize;
use tauri::Webview;

use crate::handlers::{dispath_async, Handler};

#[derive(Deserialize, Debug)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
    // your custom commands
    // multiple arguments are allowed
    // note that rename_all = "camelCase": you need to use "myCustomCommand" on JS
    AsyncCommand {
        handler: Handler,
        callback: String,
        error: String,
    },
}

pub fn dispatch_command(_webview: &mut Webview, arg: &str) -> Result<(), String> {
    match serde_json::from_str(arg) {
        Err(e) => Err(e.to_string()),
        Ok(command) => {
            match command {
                Cmd::AsyncCommand {
                    handler,
                    callback,
                    error,
                } => dispath_async(_webview, handler, callback, error),
            }
            Ok(())
        }
    }
}
