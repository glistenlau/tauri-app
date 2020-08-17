use super::{Endpoint, Response, ResponseError, ResponseResult};
use crate::proxies::fs::append_file;
use crate::proxies::java_props::load_props;
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::time::{Duration, Instant};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Search,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Payload {
    filepath: String,
    classname: String,
}

pub fn handle_command(endpoint: Endpoint<Action, Payload>) -> Result<HashMap<String, HashMap<String, (Option<String>, Option<String>)>>> {
  let Endpoint { action, payload} = endpoint;
  let Payload {filepath, classname} = payload;

  match action {
    Action::Search => load_props(&filepath, &classname)
  }
}
