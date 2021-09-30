use async_graphql::*;
use crate::core::formatter;

#[derive(Default)]
pub struct SqlFormatterQuery;

#[Object]
impl SqlFormatterQuery {
    async fn format_sql(&self, _ctx: &Context<'_>, sql_stmts: Vec<String>) -> Result<Vec<String>> {
      Ok(sql_stmts.iter().map(|stmt| formatter::format_sql(stmt)).collect())
    }
}
