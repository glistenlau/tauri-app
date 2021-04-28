use juniper::GraphQLObject;

#[derive(GraphQLObject, Debug, Default)]
pub struct DataTable {
    columns: Vec<String>,
    rows: Vec<Vec<String>>,
}
