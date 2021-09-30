use std::time::Duration;

use async_graphql::*;
use futures::Stream;
use tokio_stream::StreamExt;

use crate::proxies::db_schema::{search_db_schema_flat, FlatSchemaFile, Range};
use crate::proxies::{
    db_explain_tree::{parse_db_explain, ExplainRow},
    db_schema::{search_db_schema, SchemaFile},
    rocksdb::RocksDataStore,
};

pub struct Query;

#[Object]
impl Query {
    async fn db_schemas(
        &self,
        _ctx: &Context<'_>,
        search_folder: String,
        search_pattern: String,
    ) -> Result<Vec<SchemaFile>> {
        let search_results = search_db_schema(&search_folder, &search_pattern).map_err(|err| {
            log::error!("db schema error: {:?}", err);
            return FieldError::from(err);
        });
        search_results
    }

    async fn db_schema_file_content(
        &self,
        _ctx: &Context<'_>,
        file_path: String,
        ranges: Vec<Range>,
    ) -> Result<Vec<String>> {
        let db = crate::proxies::rocksdb::get_conn();
        let file_content = RocksDataStore::get(&file_path, &db, Some("db_schema"))?;

        if let Some(content) = file_content {
            Ok(ranges
                .iter()
                .map(move |Range { start, end }| {
                    if *start >= content.len() || *end >= content.len() {
                        return "".to_owned();
                    }
                    content[*start..*end + 1].to_owned()
                })
                .collect())
        } else {
            Err(FieldError::new("the schema file content doesn't exist."))
        }
    }

    async fn db_schemas_flat(
        &self,
        _ctx: &Context<'_>,
        search_folder: String,
        search_pattern: String,
    ) -> Result<Vec<FlatSchemaFile>> {
        let search_results =
            search_db_schema_flat(&search_folder, &search_pattern).map_err(|err| {
                log::error!("db schema error: {:?}", err);
                return FieldError::from(err);
            });
        search_results
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

pub struct Subscription;

#[Subscription]
impl Subscription {
    async fn integers(&self, #[graphql(default = 1)] step: i32) -> impl Stream<Item = i32> {
        let mut value = 0;
        tokio_stream::wrappers::IntervalStream::new(tokio::time::interval(Duration::from_secs(1)))
            .map(move |_| {
                value += step;
                value
            })
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
