use crate::proxies::rocksdb::{self, RocksDataStore};
use async_graphql::{Object, Result};

#[derive(Default)]
pub struct RocksDbQuery;

#[Object]
impl RocksDbQuery {
    async fn get_rocksdb_values(&self, keys: Vec<String>) -> Result<Vec<Option<String>>> {
        get_values(keys)
    }
}

fn get_values(keys: Vec<String>) -> Result<Vec<Option<String>>> {
    let db = rocksdb::get_conn();
    RocksDataStore::multi_get(None::<String>, &keys, &db).map_err(|e| e.into())
}

#[derive(Default)]
pub struct RocksDbMutation;

#[Object]
impl RocksDbMutation {
    async fn set_rocksdb_values(&self, _keys: Vec<String>, _values: Vec<String>) -> Result<bool> {
        todo!()
    }

    async fn delete_rocksdb_values(&self, _keys: Vec<String>) -> Result<bool> {
        todo!()
    }
}
