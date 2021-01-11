use super::{Endpoint, Response};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    FormatSql,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    snippets: Vec<String>,
}

// pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Response<Vec<String>> {
//     let Endpoint { action, payload } = endpoint;
//     let now = Instant::now();

//     match action {
//         Action::FormatSql => {
//             let Payload { snippets } = payload;
//         }
//     }
// }
