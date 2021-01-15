
use std::time::{Instant};


use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{Endpoint, Response, ResponseResult};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Debug,
    Error,
    Info,
    Trace,
    Warn,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    target: Option<String>,
    message: Value,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Response<()> {
    let Endpoint { action, payload } = endpoint;
    let Payload { target, message } = payload;
    let now = Instant::now();


    let level = match action {
        Action::Debug => log::Level::Debug,
        Action::Error => log::Level::Error,
        Action::Info => log::Level::Info,
        Action::Trace => log::Level::Trace,
        Action::Warn => log::Level::Warn,
    };

    match target {
        Some(tar) => log::log!(target: &tar, level, "{}", message),
        None => log::log!(level, "{}", message),
    }

    Response::new(true, now.elapsed(), ResponseResult::Result(()))
}
