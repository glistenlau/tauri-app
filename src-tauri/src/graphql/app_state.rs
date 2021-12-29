use crate::proxies::rocksdb::{self, RocksDataStore};
use async_graphql::*;

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
enum AppStateKey {
    SchemaEditorOpenNodeIds,
    SchemaEditorTreeNode,
    SchemaEditorSelectedNode,
    SchemaEditorSelectedFilePath,
    SchemaEditorSearchTerm,
    OralceConfig,
    PostgresConfig,
}

#[derive(InputObject)]
struct JavaProp {
    class_name: String,
}

#[Object]
impl JavaProp {
   pub async fn state_key_str(&self) -> String {
       self.class_name.clone()
   } 
}

#[derive(Union)]
enum AppStateKeyTest {
    JavaProp(JavaProp)
}

static APP_STATE_CF: &str = "APP_STATE";

#[derive(Default)]
pub struct AppStateQuery;

#[Object]
impl AppStateQuery {
    async fn app_state(
        &self,
        _ctx: &Context<'_>,
        mut state_keys: Vec<AppStateKeyTest>,
    ) -> Result<Vec<Option<String>>> {
        let db = rocksdb::get_conn();
        let key_strs: Vec<String> = state_keys
            .drain(..)
            .map(|key| format!("{:?}", key))
            .collect();
        let keys_ref: Vec<&str> = key_strs.iter().map(|k| k.as_ref()).collect();

        Ok(RocksDataStore::multi_get(
            Some(APP_STATE_CF),
            &keys_ref,
            &db,
        )?)
    }
}

#[derive(Default)]
pub struct AppStateMutation;

#[Object]
impl AppStateMutation {
    async fn app_state(
        &self,
        _ctx: &Context<'_>,
        mut state_keys: Vec<AppStateKey>,
        state_vals: Vec<String>,
    ) -> Result<bool> {
        if state_keys.len() != state_vals.len() {
            return Err(Error::new("The sizes of keys and values are not same."));
        }
        let mut db = rocksdb::get_conn();
        let mut key_vals: Vec<(&str, &str)> = Vec::with_capacity(state_keys.len());
        let key_strs: Vec<String> = state_keys
            .drain(..)
            .map(|key| format!("{:?}", key))
            .collect();
        for i in 0..key_strs.len() {
            key_vals.push((&key_strs[i], &state_vals[i]))
        }

        RocksDataStore::write_batch(APP_STATE_CF, &key_vals, &mut db)?;
        Ok(true)
    }
}
