use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

pub mod query_runner;

#[derive(Deserialize, Debug)]
pub struct Endpoint<A, P> {
    pub action: A,
    pub payload: P,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "name", rename_all = "camelCase")]
pub enum Handler {
    QueryRunner(Endpoint<query_runner::Action, query_runner::Payload>),
}

#[derive(Serialize, Deserialize)]
pub struct ResponseError {
    message: String,
}

impl ResponseError {
    pub fn new(message: String) -> ResponseError {
        ResponseError { message }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum ResponseResult<T> {
    Result(T),
    Error(ResponseError),
}

impl<T> ResponseResult<T> {
    fn new_result(result: T) -> ResponseResult<T> {
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

impl<T> Response<T> {
    fn new(success: bool, elapsed: Duration, result: ResponseResult<T>) -> Response<T> {
        Response {
            success,
            elapsed,
            result,
        }
    }
}

pub fn seralize_response<T: Serialize>(rsp_obj: T) -> Result<String> {
    match serde_json::to_string(&rsp_obj) {
        Ok(seralized) => Ok(seralized),
        Err(e) => Err(anyhow!("Seralize response error: {}", e)),
    }
}

pub fn generate_response<T: Serialize>(res: Result<T>, elapsed: Duration) -> Result<String> {
    let rsp: Response<T> = match res {
        Ok(r) => Response::new(true, elapsed, ResponseResult::new_result(r)),
        Err(e) => Response::new(
            false,
            elapsed,
            ResponseResult::new_error(ResponseError::new(e.to_string())),
        ),
    };

    match serde_json::to_string(&rsp) {
        Ok(seralized) => Ok(seralized),
        Err(e) => Err(anyhow!("Seralize response error: {}", e)),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct CommandError {
    message: String,
}

impl CommandError {
    fn new(message: String) -> Self {
        Self { message }
    }
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CommandError {}

#[tauri::command]
pub fn invoke_handler(
    window: tauri::Window,
    _state: tauri::State<AppState>,
    handler: Handler,
) -> Result<String, CommandError> {
    let now = Instant::now();
    let result = match handler {
        Handler::QueryRunner(e) => generate_response(
            query_runner::handle_command(window, e.action, e.payload),
            now.elapsed(),
        ),
    };
    result.or_else(|e| Err(CommandError::new(e.to_string())))
}
