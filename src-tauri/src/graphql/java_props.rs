use async_graphql::*;

#[derive(Default)]
pub struct JavaPropsQuery;

#[Object]
impl JavaPropsQuery {
    async fn searchJavaProps(&self, _path: String, _classname: String) -> Result<i32> {
        todo!()
    }
}
