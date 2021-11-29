use crate::proxies::oracle;
use crate::proxies::postgres::{self};
use crate::proxies::sql_common::{execute_stmt, get_schema_stmt, DBType, SQLClient, SQLResult};
use async_graphql::*;

#[derive(Default)]
pub struct SqlQuery;

#[Object]
impl SqlQuery {
    async fn execute_stmt(
        &self,
        db_type: DBType,
        schema: String,
        stmt: String,
        params: Vec<Json<serde_json::Value>>,
        with_statistics: bool,
    ) -> Result<Json<SQLResult>> {
        let params_json: Vec<serde_json::Value> = params
            .iter()
            .map(|param| {
                async_graphql::InputType::to_value(param)
                    .into_json()
                    .unwrap()
            })
            .collect();

        let res = match db_type {
            DBType::Oracle => execute_stmt(
                &get_schema_stmt(&schema, &stmt),
                &params_json,
                with_statistics,
                oracle::get_proxy(),
            ),
            DBType::Postgres => execute_stmt(
                &get_schema_stmt(&schema, &stmt),
                &params_json,
                with_statistics,
                postgres::get_proxy(),
            ),
        };

        match res {
            Ok(sql_res) => Ok(Json::from(sql_res)),
            Err(e) => Err(Error::from(e)),
        }
    }
}
