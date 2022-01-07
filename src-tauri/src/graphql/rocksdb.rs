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
    RocksDataStore::multi_get(None, &keys, &db).map_err(|e| e.into())
}

#[derive(Default)]
pub struct RocksDbMutation;

#[Object]
impl RocksDbMutation {
    async fn set_rocksdb_values(&self, keys: Vec<String>, values: Vec<String>) -> Result<bool> {
        let mut db = rocksdb::get_conn();
        RocksDataStore::set_batch(None, &keys, &values, &mut db)?;
        Ok(true)
    }

    async fn delete_rocksdb_values(&self, keys: Vec<String>) -> Result<bool> {
        let db = rocksdb::get_conn();
        RocksDataStore::delete_batch(None, &keys, &db)?;
        Ok(true)
    }
}
