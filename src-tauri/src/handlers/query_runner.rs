use std::sync::Arc;

use crate::{
    core::parameter_iterator::ParameterGenerateStrategy,
    proxies::{query_runner::scan_queries, query_runner::RunResults, sql_common::DBType},
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Query {
    db_type: DBType,
    statement: String,
    parameters: Option<Vec<Vec<Value>>>,
    mode: ParameterGenerateStrategy,
}

impl Query {
    pub fn db_type(&self) -> DBType {
        self.db_type.clone()
    }

    pub fn statement(&self) -> &str {
        &self.statement
    }

    pub fn parameters(&self) -> Option<&Vec<Vec<Value>>> {
        self.parameters.as_ref()
    }

    pub fn mode(&self) -> ParameterGenerateStrategy {
        self.mode.clone()
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Payload {
    schemas: Vec<String>,
    queries: Vec<Query>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    ScanQueries,
}

pub fn handle_command(action: Action, Payload { schemas, queries }: Payload) -> Result<RunResults> {
    match action {
        Action::ScanQueries => Ok(scan_queries(schemas, queries)),
    }
}
