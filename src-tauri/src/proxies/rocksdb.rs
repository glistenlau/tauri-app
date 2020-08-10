use rocksdb::DB;

pub struct RocksDataStore {}

impl RocksDataStore {
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

  pub fn put(&self, key: &str, val: &str) -> Result<(), rocksdb::Error> {
    let db = DB::open_default(self.get_path())?;
    db.put(key.as_bytes(), val.as_bytes())
  }

  pub fn get(&self, key: &str) -> Result<Option<Vec<u8>>, rocksdb::Error> {
    let db = DB::open_default(self.get_path())?;
    db.get(key.as_bytes())
  }

  pub fn delete(&self, key: &str) -> Result<(), rocksdb::Error> {
    let db = DB::open_default(self.get_path())?;
    db.delete(key.as_bytes())
  }
}

static DATA_STORE: RocksDataStore = RocksDataStore {};

pub fn get_proxy() -> &'static RocksDataStore {
  &DATA_STORE
}
