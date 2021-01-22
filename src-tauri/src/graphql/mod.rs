use std::{fmt::Display, fs, todo};

use anyhow::Result;
use juniper::{
    graphql_object, EmptyMutation, EmptySubscription, FieldError, FieldResult, GraphQLEnum,
    GraphQLInputObject, GraphQLObject, ScalarValue, Value, Variables,
};
use serde::{Deserialize, Serialize};

use crate::{
    core::db_schema_processor::NodeValue,
    proxies::db_schema::{search_db_schema, SchemaFile},
};


pub struct Context {}

// To make our context usable by Juniper, we have to implement a marker trait.
impl juniper::Context for Context {}

pub struct Query;

#[graphql_object()]
impl Query {
    fn apiVersion() -> &str {
        "1.0"
    }

    fn db_schemas(search_folder: String, search_pattern: String) -> FieldResult<Vec<SchemaFile>> {
        search_db_schema(&search_folder, &search_pattern).map_err(|err| FieldError::from(err))
    }
}

// Now, we do the same for our Mutation type.

pub struct Mutation;

#[graphql_object()]
impl Mutation {
    fn change_schema_values(file_path: String, values: Vec<String>) -> FieldResult<SchemaFile> {
        todo!()
    }
}

// A root schema consists of a query, a mutation, and a subscription.
// Request queries can be executed against a RootNode.
pub type Schema = juniper::RootNode<'static, Query, Mutation, EmptySubscription>;

#[cfg(test)]
mod tests {
    use juniper::ExecutionOutput;

    use super::*;

    #[test]
    fn test() {
        let schema = Schema::new(Query, Mutation, EmptySubscription::new());
        let res = juniper::execute_sync(
            "query { human(id: \"testid\") {id name} }",
            None,
            &schema,
            &Variables::new(),
            &(),
        )
        .unwrap();
        let output = ExecutionOutput {
            data: res.0,
            errors: res.1,
        };

        println!("graphql test: {}", serde_json::to_string(&output).unwrap());
    }
}
