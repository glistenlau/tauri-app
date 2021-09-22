use std::{
    fs::File,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};

use anyhow::{anyhow, Result};
use lazy_static::lazy_static;
use rocksdb::{Options, WriteBatch, DB};

use super::dirs::get_data_dir;

pub struct RocksDataStore {
    conn: Option<Arc<Mutex<DB>>>,
}

impl RocksDataStore {
    fn new() -> Self {
        RocksDataStore { conn: None }
    }

    fn new_conn(&mut self) -> Result<DB> {
        let path = Self::get_path();
        match DB::list_cf(&Options::default(), &path) {
            Ok(cf_list) => {
                match DB::open_cf(&Options::default(), &path, cf_list) {
                    Ok(db) => return Ok(db),
                    Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
                };
            }
            Err(e) => {
                log::info!("list cf error: {}", e);
                match DB::open_default(&path) {
                    Ok(db) => return Ok(db),
                    Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
                }
            }
        }
    }

    pub fn get_conn(&mut self) -> Result<Arc<Mutex<DB>>> {
        // if self.conn.is_none() {
        //     log::info!("No existing rocksdb connection, try to create a new one.");
        //     let path = Self::get_path();
        //
        //     match DB::list_cf(&Options::default(), &path) {
        //         Ok(cf_list) => {
        //             self.conn = match DB::open_cf(&Options::default(), &path, cf_list) {
        //                 Ok(db) => Some(Arc::new(Mutex::new(db))),
        //                 Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
        //             };
        //         }
        //         Err(e) => {
        //             log::info!("list cf error: {}", e);
        //             self.conn = match DB::open_default(&path) {
        //                 Ok(db) => Some(Arc::new(Mutex::new(db))),
        //                 Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
        //             }
        //         }
        //     }
        // }
        //
        // Ok(Arc::clone(&self.conn.as_ref().unwrap()))
        self.new_conn().map(|db| Arc::new(Mutex::new(db)))
    }

    fn get_path() -> PathBuf {
        let mut data_path = get_data_dir();
        data_path.push("_data");
        data_path
    }

    pub fn put(key: &str, val: &str, db: &DB) -> Result<(), rocksdb::Error> {
        db.put(key.as_bytes(), val.as_bytes())
    }

    pub fn get(key: &str, db: &DB) -> Result<Option<Vec<u8>>, rocksdb::Error> {
        db.get(key.as_bytes())
    }

    pub fn delete(key: &str, db: &DB) -> Result<(), rocksdb::Error> {
        db.delete(key.as_bytes())
    }

    pub fn write_batch(
        db: &mut DB,
        cf: &str,
        key_vals: Vec<(String, String)>,
    ) -> Result<(), rocksdb::Error> {
        Self::create_cf_if_not(cf, db)?;
        let mut write_batch = WriteBatch::default();
        let cf_handle = db.cf_handle(cf).unwrap();
        for (key, val) in key_vals {
            write_batch.put_cf(cf_handle, key, val);
        }

        db.write(write_batch)
    }

    fn create_cf_if_not(cf: &str, db: &mut DB) -> Result<(), rocksdb::Error> {
        if let Some(_) = db.cf_handle(cf) {
            return Ok(());
        }

        db.create_cf(cf, &Options::default())
    }
}

lazy_static! {
    static ref DATA_STORE: Arc<Mutex<RocksDataStore>> = Arc::new(Mutex::new(RocksDataStore::new()));
}

pub fn get_proxy() -> Arc<Mutex<RocksDataStore>> {
    Arc::clone(&DATA_STORE)
}

#[cfg(test)]
mod tests {

    use rocksdb::{MergeOperands, Options};
    use serde_json::{json, Value};

    use super::*;

    #[test]
    fn test_cf() {
        let mut data_store = DATA_STORE.lock().unwrap();
        let conn = data_store.get_conn().unwrap();
        let mut conn_lock = conn.lock().unwrap();
        let cf_handle = match conn_lock.cf_handle("test_cf") {
            Some(ch) => ch,
            None => {
                println!("test_cf not exists, create it...");
                conn_lock.create_cf("test_cf", &Options::default()).unwrap();
                conn_lock.cf_handle("test_cf").unwrap()
            }
        };
        let mut write_batch = WriteBatch::default();
        write_batch.put_cf(cf_handle, "test_key", "test_val");
        conn_lock.write(write_batch).unwrap();
        write_batch = WriteBatch::default();
        write_batch.put_cf(cf_handle, "test_key", "test_val");
        write_batch.put_cf(cf_handle, "test_key2", "test_val2");
        conn_lock.write(write_batch).unwrap();
        assert_eq!(
            conn_lock.get_cf(cf_handle, "test_key").unwrap().unwrap(),
            b"test_val",
            "test_key should be write successfully."
        );
        assert_eq!(
            conn_lock.get_cf(cf_handle, "test_key2").unwrap().unwrap(),
            b"test_val2",
            "test_key2 should be write successfully."
        );
        conn_lock.drop_cf("test_cf").unwrap();
    }

    fn merge(a: &mut Value, b: &Value) {
        match (a, b) {
            (&mut Value::Object(ref mut a), &Value::Object(ref b)) => {
                for (k, v) in b {
                    merge(a.entry(k.clone()).or_insert(Value::Null), v);
                }
            }
            (a, b) => {
                *a = b.clone();
            }
        }
    }

    fn obj_merge(
        _new_key: &[u8],
        existing_val: Option<&[u8]>,
        operands: &mut MergeOperands,
    ) -> Option<Vec<u8>> {
        let mut result: Vec<u8> = Vec::with_capacity(operands.size_hint().0);
        let mut existing_value: Value = existing_val
            .map(|v| serde_json::from_slice(v).unwrap())
            .unwrap_or(json!("{}"));
        for op in operands {
            for e in op {
                result.push(*e)
            }
        }
        let new_value: Value = serde_json::from_slice(&result).unwrap();
        merge(&mut existing_value, &new_value);
        Some(existing_value.to_string().into_bytes())
    }

    #[test]
    fn test_merge() {
        let mut opts = Options::default();
        opts.set_merge_operator("object_merger", obj_merge, obj_merge);
        opts.create_if_missing(true);
        let mut path = RocksDataStore::get_path();
        path.push("_test");
        let db = DB::open(&opts, path).unwrap();
        db.put(b"test", b"{\"name\": \"John Doe\"}");
        db.merge(b"test", b"{\"gender\": \"male\"}");
        let r = db.get(b"test").unwrap();
        println!("{}", String::from_utf8(r.unwrap()).unwrap());
    }
}
