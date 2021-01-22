use std::fs;

use juniper::EmptySubscription;

use mylib::graphql::{Mutation, Query, Schema};

pub fn main() {
    let schema = Schema::new(Query, Mutation, EmptySubscription::new());
    fs::write("../data/schema.graphql", schema.as_schema_language()).unwrap();
}
