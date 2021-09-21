use anyhow::Result;
use async_graphql::*;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

use super::Endpoint;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Query,
    ServerPort,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Payload {
    query: Option<String>,
    variables: Option<Variables>,
}

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ResponseBody {
    server_port: u16,
}

pub fn handle_command(
    Endpoint { action, payload: _ }: Endpoint<Action, Payload>,
    state: tauri::State<AppState>,
) -> Result<ResponseBody> {
    match action {
        Action::Query => Ok(ResponseBody {server_port: state.server_port}),
        Action::ServerPort => Ok(ResponseBody {server_port: state.server_port}),
    }
}
