mod db_schema;
mod sql_explain;
mod sql_formatter;

use async_graphql::*;
use futures::Stream;
use std::time::Duration;
use tokio_stream::StreamExt;

use db_schema::DbSchemaQuery;
use sql_formatter::SqlFormatterQuery;

use self::sql_explain::SqlExplainQuery;

#[derive(MergedObject, Default)]
pub struct Query(DbSchemaQuery, SqlExplainQuery, SqlFormatterQuery);

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
            let schema = Schema::new(Query::default(), EmptyMutation, EmptySubscription);
            let res = schema
                .execute("query { human(id: \"testid\") {id name} }")
                .await;

            println!("graphql test: {}", serde_json::to_string(&res).unwrap());
        });
    }
}
