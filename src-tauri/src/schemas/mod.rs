use std::{fmt::Display, fs};

use anyhow::Result;
use juniper::{
    EmptyMutation, EmptySubscription, FieldResult, graphql_object, GraphQLEnum, GraphQLInputObject,
    GraphQLObject, ScalarValue, Value, Variables,
};
use serde::{Deserialize, Serialize};

#[derive(GraphQLEnum)]
enum Episode {
    NewHope,
    Empire,
    Jedi,
}

#[derive(GraphQLObject)]
#[graphql(description = "A humanoid creature in the Star Wars universe")]
struct Human {
    id: String,
    name: String,
    appears_in: Vec<Episode>,
    home_planet: String,
}

// There is also a custom derive for mapping GraphQL input objects.

#[derive(GraphQLInputObject)]
#[graphql(description = "A humanoid creature in the Star Wars universe")]
struct NewHuman {
    name: String,
    appears_in: Vec<Episode>,
    home_planet: String,
}

// Now, we create our root Query and Mutation types with resolvers by using the
// object macro.
// Objects can have contexts that allow accessing shared state like a database
// pool.

pub struct Context {}

// To make our context usable by Juniper, we have to implement a marker trait.
impl juniper::Context for Context {}

pub struct Query;

#[graphql_object(
// Here we specify the context type for the object.
// We need to do this in every type that
// needs access to the context.
context = Context,
)]
impl Query {
    fn apiVersion() -> &str {
        "1.0"
    }

    // Arguments to resolvers can either be simple types or input objects.
    // To gain access to the context, we specify a argument
    // that is a reference to the Context type.
    // Juniper automatically injects the correct context here.
    fn human(context: &Context, id: String) -> FieldResult<Human> {
        // Get a db connection.
        let human = Human {
            id: id,
            name: "name".to_string(),
            appears_in: vec![],
            home_planet: "home planet".to_string(),
        };
        // Return the result.
        Ok(human)
    }
}

// Now, we do the same for our Mutation type.

pub struct Mutation;

#[graphql_object(
context = Context,

// If we need to use `ScalarValue` parametrization explicitly somewhere
// in the object definition (like here in `FieldResult`), we should
// declare an explicit type parameter for that, and specify it.
scalar = S,
)]
impl<S: ScalarValue + Display> Mutation {
    fn createHuman(context: &Context, new_human: NewHuman) -> FieldResult<Human, S> {
        let human = Human {
            id: "id".to_string(),
            name: "name".to_string(),
            appears_in: vec![],
            home_planet: "home planet".to_string(),
        };
        Ok(human)
    }
}

// A root schema consists of a query, a mutation, and a subscription.
// Request queries can be executed against a RootNode.
pub type Schema = juniper::RootNode<'static, Query, Mutation, EmptySubscription<Context>>;


pub fn main() {
    let schema = Schema::new(Query, Mutation {}, EmptySubscription::new());
    fs::write("../data/schema.graphql", schema.as_schema_language()).unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test() {
        let ctx = Context {};
        let schema = Schema::new(Query, Mutation {}, EmptySubscription::new());
        let (res, _errors) = juniper::execute_sync(
            "query { human(id: \"testid\") {id name} }",
            None,
            &schema,
            &Variables::new(),
            &ctx,
        )
            .unwrap();

        println!("graphql test: {}", serde_json::to_string(&res).unwrap());
    }
}
