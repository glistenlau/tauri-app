use std::time::Instant;

use serde::{Deserialize, Serialize};

use crate::core::formatter::format_sql;

use super::{Endpoint, Response, ResponseResult};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    FormatSql,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    snippets: Vec<String>,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Response<Vec<String>> {
    let Endpoint { action, payload } = endpoint;
    let now = Instant::now();

    match action {
        Action::FormatSql => {
            let Payload { snippets } = payload;
            Response::new(
                true,
                now.elapsed(),
                ResponseResult::new_result(
                    snippets.iter().map(|snippet| format_sql(snippet)).collect(),
                ),
            )
        }
    }
}
