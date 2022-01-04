use crate::proxies::rocksdb::{self, RocksDataStore};

use anyhow::{anyhow, Result};

#[derive(async_graphql::Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum AppStateKey {
    SchemaEditorOpenNodeIds,
    SchemaEditorTreeNode,
    SchemaEditorSelectedNode,
    SchemaEditorSelectedFilePath,
    SchemaEditorSearchTerm,
    OralceConfig,
    PostgresConfig,
    PropsMatchedClassList,
    PropsSearchFilepath,
    PropsSearchClassPattern,
    PropsSelectedClass,
    PropsSelectedPropKey,
    PropsSelectedPropValues,
}

static APP_STATE_CF: &str = "APP_STATE";

pub fn get_state(state_keys: Vec<AppStateKey>) -> Result<Vec<Option<String>>> {
    let db = rocksdb::get_conn();
    let key_strs: Vec<String> = state_keys.iter().map(|key| format!("{:?}", key)).collect();
    let keys_ref: Vec<&str> = key_strs.iter().map(|k| k.as_ref()).collect();

    RocksDataStore::multi_get(Some(APP_STATE_CF), &keys_ref, &db)
}

pub fn set_state(state_keys: Vec<AppStateKey>, state_vals: Vec<String>) -> Result<bool> {
    if state_keys.len() != state_vals.len() {
        return Err(anyhow!("The sizes of keys and values are not same."));
    }
    let mut db = rocksdb::get_conn();
    let mut key_vals: Vec<(&str, &str)> = Vec::with_capacity(state_keys.len());
    let key_strs: Vec<String> = state_keys.iter().map(|key| format!("{:?}", key)).collect();
    for i in 0..key_strs.len() {
        key_vals.push((&key_strs[i], &state_vals[i]))
    }

    RocksDataStore::write_batch(APP_STATE_CF, &key_vals, &mut db)?;
    Ok(true)
}

pub fn delete_state(state_keys: Vec<AppStateKey>) -> Result<()> {
    let db = rocksdb::get_conn();
    let key_strs: Vec<String> = state_keys.iter().map(|key| format!("{:?}", key)).collect();
    let keys_ref: Vec<&str> = key_strs.iter().map(|k| k.as_ref()).collect();

    RocksDataStore::delete_batch(Some(APP_STATE_CF), &keys_ref, &db).map_err(|e| e.into())
}
