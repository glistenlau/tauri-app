use crate::proxies::db_explain_tree::{parse_db_explain, ExplainRow};
use async_graphql::*;

#[derive(Default)]
pub struct SqlQuery;

#[Object]
impl SqlQuery {
    async fn execute_stmt(&self, text: String) -> Result<Vec<ExplainRow>> {
        log::debug!(
            "execute db explain text: {}, target_id: {:?}",
            text,
            target_id
        );
        Ok(parse_db_explain(&text))
    }
}
