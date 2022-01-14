use std::fs;

use async_graphql::Schema;
use mylib::graphql::{Mutation, Query, Subscription};

pub fn main() {
    let schema = Schema::new(
        Query::default(),
        Mutation::default(),
        Subscription::default(),
    );
    fs::write("../data/schema.graphql", schema.sdl()).unwrap();
}
