use std::{collections::HashMap};

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    core::parameter_iterator::ParameterGenerateStrategy,
    proxies::{query_runner::RunResults, query_runner::scan_queries, sql_common::DBType},
};

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
    schema_queries: HashMap<String, Vec<Query>>,
    diff_results: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    ScanQueries,
}

pub fn handle_command(
    action: Action,
    Payload {
        schema_queries,
        diff_results,
    }: Payload,
) -> Result<RunResults> {
    log::debug!("got query runner command.");
    match action {
        Action::ScanQueries => Ok(scan_queries(schema_queries, diff_results)),
    }
}
