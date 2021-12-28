use async_graphql::*;

#[derive(Default)]
pub struct JavaPropsQuery;

#[Object]
impl JavaPropsQuery {
    async fn searchJavaProps(&self, path: String, classname: String) -> Result<i32> {
        todo!()
    }
}
