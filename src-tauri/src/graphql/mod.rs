

use async_graphql::*;

use crate::proxies::{
    db_explain_tree::{parse_db_explain, ExplainRow},
    db_schema::{search_db_schema, SchemaFile},
};

pub struct Context {}

// To make our context usable by Juniper, we have to implement a marker trait.
impl juniper::Context for Context {}

pub struct Query;

#[Object]
impl Query {
    async fn db_schemas(
        &self,
        search_folder: String,
        search_pattern: String,
    ) -> Result<Vec<SchemaFile>> {
        search_db_schema(&search_folder, &search_pattern).map_err(|err| FieldError::from(err))
    }

    async fn db_explain(&self, text: String, target_id: Option<i32>) -> Result<Vec<ExplainRow>> {
        log::debug!(
            "execute db explain text: {}, target_id: {:?}",
            text,
            target_id
        );
        Ok(parse_db_explain(&text))
    }
}

#[cfg(test)]
mod tests {
    use tokio::runtime::Runtime;

    use super::*;

    #[test]
    fn test() {
        let runtime = Runtime::new().unwrap();
        runtime.block_on(async {
            let schema = Schema::new(Query, EmptyMutation, EmptySubscription);
            let res = schema
                .execute("query { human(id: \"testid\") {id name} }")
                .await;


            println!("graphql test: {}", serde_json::to_string(&res).unwrap());
        });
    }
}
