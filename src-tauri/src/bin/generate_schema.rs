use std::fs;

use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use mylib::graphql::{Query, Subscription};

pub fn main() {
    let schema = Schema::new(Query, EmptyMutation, Subscription);
    fs::write("../data/schema.graphql", schema.sdl()).unwrap();
}
