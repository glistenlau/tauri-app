use anyhow::{anyhow, Result};
use juniper::{DefaultScalarValue, EmptySubscription, ExecutionError, Value, Variables};
use serde::{Deserialize, Serialize};

use crate::schemas::{Context, Mutation, Query, Schema};

use super::{Endpoint, seralize_response};

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    Query,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Payload {
    query: String,
    variables: Variables,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Response {
    data: Option<Value>,
    errors: Option<Vec<ExecutionError<DefaultScalarValue>>>,
}

pub fn handle_command(Endpoint { action, payload }: Endpoint<Action, Payload>) -> Result<String> {
    log::debug!("Got GraphQL request: {:?}, {:?}", action, payload);
    let ctx = Context {};
    let schema = Schema::new(Query, Mutation {}, EmptySubscription::new());
    let res = juniper::execute_sync(&payload.query, None, &schema, &payload.variables, &ctx);
    let mapped_res = res
        .map_err(|err| anyhow!(err.to_string()))
        .map(|(val, exec_errs)| Response {
            data: if exec_errs.len() > 0 { None } else { Some(val) },
            errors: if exec_errs.len() == 0 {
                None
            } else {
                Some(exec_errs)
            },
        });
    Ok(seralize_response(mapped_res?)?)
}
