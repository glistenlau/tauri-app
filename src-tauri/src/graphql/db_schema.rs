use crate::{proxies::{db_schema::{FlatSchemaFile, Range, SchemaFile, search_db_schema, search_db_schema_flat}, rocksdb::RocksDataStore}};
use async_graphql::*;

#[derive(Default)]
pub struct DbSchemaQuery;

#[Object]
impl DbSchemaQuery {
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
}
