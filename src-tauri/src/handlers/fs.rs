use std::time::Instant;

use serde::{Deserialize, Serialize};

use crate::proxies::fs::append_file;

use super::{Endpoint, Response, ResponseError, ResponseResult};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Append,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    path: String,
    value: String,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Response<String> {
    let Endpoint { action, payload } = endpoint;
    let now = Instant::now();

    match action {
        Action::Append => {
            let Payload { path, value } = payload;

            match append_file(&path, &value) {
                Ok(()) => Response::new(
                    true,
                    now.elapsed(),
                    ResponseResult::new_result(String::default()),
                ),
                Err(e) => Response::new(
                    false,
                    now.elapsed(),
                    ResponseResult::new_error(ResponseError::new(e.to_string())),
                ),
            }
        }
    }
}
