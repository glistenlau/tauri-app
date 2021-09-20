use std::fs;

use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use mylib::graphql::Query;

pub fn main() {
    let schema = Schema::new(Query, EmptyMutation, EmptySubscription);
    fs::write("../data/schema.graphql", schema.federation_sdl()).unwrap();
}
