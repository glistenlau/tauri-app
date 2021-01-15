use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use rocksdb::DB;

pub struct RocksDataStore {
    conn: Option<Arc<DB>>,
}

impl RocksDataStore {
    fn new() -> Self {
        RocksDataStore { conn: None }
    }

    pub fn get_conn(&mut self) -> Result<Arc<DB>> {
        if self.conn.is_none() {
            self.conn = match DB::open_default(self.get_path()) {
                Ok(db) => Some(Arc::new(db)),
                Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e))
            }
        }

        Ok(Arc::clone(self.conn.as_ref().unwrap()))
    }

    fn get_path(&self) -> String {
        match tauri::api::platform::resource_dir() {
            Ok(mut path) => {
                path.push("_data_store");
                return String::from(path.to_str().unwrap());
            }
            Err(e) => {
                println!("Got error while trying to get the resource dir: {}", e);
                return String::from("_data_store");
            }
        }
    }

    pub fn put(key: &str, val: &str, db: Arc<DB>) -> Result<(), rocksdb::Error> {
        db.put(key.as_bytes(), val.as_bytes())
    }

    pub fn get(key: &str, db: Arc<DB>) -> Result<Option<Vec<u8>>, rocksdb::Error> {
        db.get(key.as_bytes())
    }

    pub fn delete(key: &str, db: Arc<DB>) -> Result<(), rocksdb::Error> {
        db.delete(key.as_bytes())
    }
}

lazy_static! {
    static ref DATA_STORE: Arc<Mutex<RocksDataStore>> = Arc::new(Mutex::new(RocksDataStore::new()));
}

pub fn get_proxy() -> Arc<Mutex<RocksDataStore>> {
    Arc::clone(&DATA_STORE)
}
