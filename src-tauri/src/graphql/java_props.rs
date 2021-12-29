use async_graphql::*;

use crate::proxies::java_props::load_props;

#[derive(Default)]
pub struct JavaPropsQuery;

#[derive(SimpleObject)]
pub struct JavaPropsQueryResult {
    clss_list: Vec<String>,
}

#[Object]
impl JavaPropsQuery {
    async fn search_java_props(&self, filepath: String, class_pattern: String, validate_pg_qeuries: bool) -> Result<JavaPropsQueryResult> {
        let file_props_map = load_props(&filepath, &class_pattern)?;
        todo!()
    }
}
