use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use async_graphql::*;


use crate::graphql::Query;

use super::{seralize_response, Endpoint};

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

pub fn handle_command(Endpoint { action, payload }: Endpoint<Action, Payload>) -> Result<String> {
    // log::debug!("Got GraphQL request: {:?}, {:?}", action, payload);
    // let schema = Schema::new(Query, EmptyMutation, EmptySubscription);
    // let res = schema.execute(request)
    // // let res = juniper::execute_sync(&payload.query, None, &schema, &payload.variables, &());
    // log::debug!("Got GraphQL results: {:?}", mapped_res);
    // Ok(seralize_response(mapped_res?)?)
    Ok("".to_string())
}
