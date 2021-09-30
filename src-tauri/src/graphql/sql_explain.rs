use crate::{core::formatter, proxies::db_explain_tree::{ExplainRow, parse_db_explain}};
use async_graphql::*;

#[derive(Default)]
pub struct SqlExplainQuery;

#[Object]
impl SqlExplainQuery {
    async fn db_explain(&self, text: String, target_id: Option<i32>) -> Result<Vec<ExplainRow>> {
        log::debug!(
            "execute db explain text: {}, target_id: {:?}",
            text,
            target_id
        );
        Ok(parse_db_explain(&text))
    }
}
