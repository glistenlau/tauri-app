mod app_state;
mod db_schema;
mod sql;
mod sql_explain;
mod sql_formatter;
mod java_props;

use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::Schema;
use async_graphql::*;
use async_graphql_warp::{graphql_subscription, GraphQLResponse};
use futures::Stream;
use std::convert::Infallible;
use std::time::Duration;
use tokio_stream::StreamExt;

use db_schema::DbSchemaQuery;
use sql_formatter::SqlFormatterQuery;

use self::sql::SqlMutation;
use self::{
    app_state::{AppStateMutation, AppStateQuery},
    sql::SqlQuery,
    sql_explain::SqlExplainQuery,
};
use warp::{http::Response as HttpResponse, Filter};
#[derive(MergedObject, Default)]
pub struct Query(
    AppStateQuery,
    DbSchemaQuery,
    SqlQuery,
    SqlExplainQuery,
    SqlFormatterQuery,
);

#[derive(MergedObject, Default)]
pub struct Mutation(AppStateMutation, SqlMutation);

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

#[tokio::main]
pub async fn run_graphql_server(port: u16) {
    let schema = Schema::build(Query::default(), Mutation::default(), Subscription).finish();

    let graphql_post =
        warp::path("graphql").and(async_graphql_warp::graphql(schema.clone()).and_then(
            |(schema, request): (
                Schema<Query, Mutation, Subscription>,
                async_graphql::Request,
            )| async move {
                let rsp = GraphQLResponse::from(schema.execute(request).await);
                Ok::<_, Infallible>(rsp)
            },
        ));

    let graphql_playground = warp::path::end().and(warp::get()).map(|| {
        HttpResponse::builder()
            .header("content-type", "text/html")
            .body(playground_source(
                GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/"),
            ))
    });

    let routes = graphql_subscription(schema)
        .or(graphql_playground)
        .or(graphql_post.with(
            warp::cors()
                .allow_any_origin()
                .allow_header("Content-Type")
                .allow_method("POST"),
        ));

    warp::serve(routes).run(([127, 0, 0, 1], port)).await;
}

#[cfg(test)]
mod tests {
    use tokio::runtime::Runtime;

    use super::*;

    #[test]
    fn test() {
        let runtime = Runtime::new().unwrap();
        runtime.block_on(async {
            let schema = Schema::new(Query::default(), Mutation::default(), EmptySubscription);
            let res = schema
                .execute("query { human(id: \"testid\") {id name} }")
                .await;

            println!("graphql test: {}", serde_json::to_string(&res).unwrap());
        });
    }
}
