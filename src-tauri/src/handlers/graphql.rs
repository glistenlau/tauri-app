use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use async_graphql::*;

use crate::state::AppState;

use super::{seralize_response, Endpoint};

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

pub fn handle_command(Endpoint { action, payload }: Endpoint<Action, Payload>, state: tauri::State<AppState>) -> Result<String> {
    match action {
        Action::Query => Ok(state.server_port.to_string()),
        Action::ServerPort => Ok(state.server_port.to_string()),
    }
}
