use std::{
    path::PathBuf,
    sync::{Arc, Mutex, MutexGuard},
};

use anyhow::{anyhow, Result};

use lazy_static::lazy_static;
use rocksdb::{ColumnFamily, Options, WriteBatch, DB};

use super::dirs::get_data_dir;

pub struct RocksDataStore {
    conn: Option<Arc<Mutex<DB>>>,
}

impl RocksDataStore {
    fn new() -> Self {
        RocksDataStore { conn: None }
    }

    fn new_conn() -> Result<DB> {
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
        if self.conn.is_none() {
            log::info!("No existing rocksdb connection, try to create a new one.");
            let path = Self::get_path();

            match DB::list_cf(&Options::default(), &path) {
                Ok(cf_list) => {
                    self.conn = match DB::open_cf(&Options::default(), &path, cf_list) {
                        Ok(db) => Some(Arc::new(Mutex::new(db))),
                        Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
                    };
                }
                Err(e) => {
                    log::info!("list cf error: {}", e);
                    self.conn = match DB::open_default(&path) {
                        Ok(db) => Some(Arc::new(Mutex::new(db))),
                        Err(e) => return Err(anyhow!("failed to connect rocksdb {}", e)),
                    }
                }
            }
        }

        Ok(Arc::clone(&self.conn.as_ref().unwrap()))
        // self.new_conn().map(|db| Arc::new(Mutex::new(db)))
    }

    fn get_path() -> PathBuf {
        let mut data_path = get_data_dir();
        data_path.push("_data");
        data_path
    }

    pub fn put(key: &str, val: &str, db: &DB) -> Result<(), rocksdb::Error> {
        db.put(key.as_bytes(), val.as_bytes())
    }

    pub fn get(key: &str, db: &DB, cf: Option<&str>) -> Result<Option<String>> {
        log::debug!("try to get value for key: {} with cf: {:?}", key, cf);
        let res_opt = match cf.and_then(|cf_str| db.cf_handle(cf_str)) {
            Some(cf_handle) => db.get_cf(cf_handle, key.as_bytes()),
            None => db.get(key.as_bytes()),
        };

        match res_opt {
            Ok(Some(str_vals)) => Ok(Some(String::from_utf8(str_vals)?)),
            Ok(None) => Ok(None),
            Err(e) => Err(anyhow!("RocksDB get error: {}", e)),
        }
    }

    pub fn multi_get<C, T, I>(cf: Option<C>, keys: I, db: &DB) -> Result<Vec<Option<String>>>
    where
        C: AsRef<str>,
        T: AsRef<[u8]>,
        I: IntoIterator<Item = T>,
    {
        let mut res_bytes = match cf.and_then(|cf_str| db.cf_handle(cf_str.as_ref())) {
            Some(cf_handle) => {
                let multi_keys: Vec<(&ColumnFamily, T)> =
                    keys.into_iter().map(|key| (cf_handle, key)).collect();
                db.multi_get_cf(multi_keys)
            }
            None => db.multi_get(keys),
        };

        Ok(res_bytes
            .drain(..)
            .map(|res| match res {
                Ok(res_op) => res_op,
                Err(_) => None,
            })
            .map(|res_op| {
                res_op.and_then(|res_byte| match String::from_utf8(res_byte) {
                    Ok(s) => Some(s),
                    Err(_) => None,
                })
            })
            .collect())
    }

    pub fn delete(cf: Option<&str>, key: &str, db: &DB) -> Result<(), rocksdb::Error> {
        match cf.and_then(|cf_str| db.cf_handle(cf_str)) {
            Some(cf_handle) => db.delete_cf(cf_handle, key.as_bytes()),
            None => db.delete(key.as_bytes()),
        }
    }

    pub fn delete_batch(cf: Option<&str>, key: &[&str], db: &DB) -> Result<(), rocksdb::Error> {
        let mut write_batch = WriteBatch::default();
        match cf.and_then(|cf_str| db.cf_handle(cf_str)) {
            Some(cf_handle) => {
                key.iter()
                    .for_each(|key_str| write_batch.delete_cf(cf_handle, key_str.as_bytes()));
            }
            None => {
                key.iter()
                    .for_each(|key_str| write_batch.delete(key_str.as_bytes()));
            }
        };

        db.write(write_batch)
    }

    pub fn delete_range(
        cf: Option<&str>,
        from: &str,
        to: &str,
        db: &DB,
    ) -> Result<(), rocksdb::Error> {
        let mut write_batch = WriteBatch::default();
        match cf.and_then(|cf_str| db.cf_handle(cf_str)) {
            Some(cf_handle) => {
                write_batch.delete_range_cf(cf_handle, from.as_bytes(), to.as_bytes())
            }
            None => write_batch.delete_range(from.as_bytes(), to.as_bytes()),
        };

        db.write(write_batch)
    }

    pub fn write_batch(
        cf: &str,
        key_vals: &[(&str, &str)],
        db: &mut DB,
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
    static ref CONN: Mutex<DB> = Mutex::new(RocksDataStore::new_conn().unwrap());
}

pub fn get_proxy() -> Arc<Mutex<RocksDataStore>> {
    Arc::clone(&DATA_STORE)
}

pub fn get_conn() -> MutexGuard<'static, DB> {
    CONN.lock().unwrap()
}

#[cfg(test)]
mod tests {

    use rocksdb::{MergeOperands, Options};
    use serde_json::{json, Value};

    use super::*;

    static TEST_CF: &str = "test_cf";

    fn run_rocksdb_test<F>(test_fn: F)
    where
        F: FnOnce(&mut DB),
    {
        let mut conn = get_conn();
        let _cf_handle = match conn.cf_handle(TEST_CF) {
            Some(ch) => ch,
            None => {
                println!("test_cf not exists, create it...");
                conn.create_cf(TEST_CF, &Options::default()).unwrap();
                conn.cf_handle(TEST_CF).unwrap()
            }
        };

        test_fn(&mut conn);

        conn.drop_cf(TEST_CF).unwrap();
    }

    #[test]
    fn test_delete_batch() {
        run_rocksdb_test(move |mut conn| {
            let test_tuple1 = ("Test_key1", "Test_val");
            let test_tuple2 = ("Test_key2", "Test_val2");

            RocksDataStore::write_batch(TEST_CF, &[test_tuple1, test_tuple2], &mut conn).unwrap();
            let get_rst =
                RocksDataStore::multi_get(Some(TEST_CF), &[test_tuple1.0, test_tuple2.0], conn)
                    .unwrap();
            assert_eq!(
                Some(test_tuple1.1.to_string()),
                get_rst[0],
                "The first key value shoule be inserted."
            );
            assert_eq!(
                Some(test_tuple2.1.to_string()),
                get_rst[1],
                "The second key value shoule be inserted."
            );

            RocksDataStore::delete_batch(Some(TEST_CF), &[test_tuple1.0, test_tuple2.0], conn)
                .unwrap();

            let get_rst =
                RocksDataStore::multi_get(Some(TEST_CF), &[test_tuple1.0, test_tuple2.0], conn)
                    .unwrap();
            assert_eq!(None, get_rst[0], "The first key value shoule be deleted.");
            assert_eq!(None, get_rst[1], "The second key value shoule be deleted.");
        })
    }

    #[test]
    fn test_delete_range() {
        run_rocksdb_test(move |mut conn| {
            let test_key_val = vec![
                ("Test_key1", "Test_val1"),
                ("Test_key11", "Test_val11"),
                ("Test_key2", "Test_val2"),
                ("Test_key21", "Test_val21"),
                ("Test_key211", "Test_val21"),
            ];

            RocksDataStore::write_batch(TEST_CF, &test_key_val, &mut conn).unwrap();
            let keys = test_key_val.iter().map(|t| t.0).collect::<Vec<&str>>();
            let mut get_rst: Vec<Option<String>> =
                RocksDataStore::multi_get(Some(TEST_CF), &keys, conn).unwrap();

            test_key_val
                .iter()
                .enumerate()
                .for_each(|(i, t)| assert_eq!(get_rst[i], Some(t.1.to_string())));

            RocksDataStore::delete_range(Some(TEST_CF), test_key_val[0].0, test_key_val[1].0, conn)
                .unwrap();

            get_rst = RocksDataStore::multi_get(Some(TEST_CF), &keys, conn).unwrap();

            test_key_val.iter().enumerate().for_each(|(i, t)| {
                if i > 0 {
                    assert_eq!(get_rst[i], Some(t.1.to_string()));
                } else {
                    assert_eq!(get_rst[i], None);
                }
            });

            RocksDataStore::delete_range(Some(TEST_CF), test_key_val[0].0, "Test_key2~", conn)
                .unwrap();
            get_rst = RocksDataStore::multi_get(Some(TEST_CF), &keys, conn).unwrap();

            test_key_val.iter().enumerate().for_each(|(i, _t)| {
                assert_eq!(get_rst[i], None);
            });
        })
    }

    #[test]
    fn test_cf() {
        let mut data_store = DATA_STORE.lock().unwrap();
        let conn = data_store.get_conn().unwrap();
        let mut conn_lock = conn.lock().unwrap();
        let cf_handle = match conn_lock.cf_handle(TEST_CF) {
            Some(ch) => ch,
            None => {
                println!("test_cf not exists, create it...");
                conn_lock.create_cf(TEST_CF, &Options::default()).unwrap();
                conn_lock.cf_handle(TEST_CF).unwrap()
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
        conn_lock.drop_cf(TEST_CF).unwrap();
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
