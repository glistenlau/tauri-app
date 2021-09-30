use crate::proxies::db_explain_tree::{parse_db_explain, ExplainRow};
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
