use rocksdb::{DB};

pub struct RocksDataStore {
}
const DB_PATH: &str = "_data_store";

impl RocksDataStore {
  pub fn put(&self, key: &str, val: &str) -> Result<(), rocksdb::Error> {
      let db = DB::open_default(DB_PATH)?;
      db.put(key.as_bytes(), val.as_bytes())
  }

  pub fn get(&self, key: &str) -> Result<Option<Vec<u8>>, rocksdb::Error> {
      let db = DB::open_default(DB_PATH)?;
      db.get(key.as_bytes())
  }

  pub fn delete(&self, key: &str) -> Result<(), rocksdb::Error> {
      let db = DB::open_default(DB_PATH)?;
      db.delete(key.as_bytes())
  }
}


static DATA_STORE: RocksDataStore = RocksDataStore{};

pub fn getinstance() -> &'static RocksDataStore {
  &DATA_STORE
}
