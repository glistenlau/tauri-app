use serde::Deserialize;

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
  // your custom commands
  // multiple arguments are allowed
  // note that rename_all = "camelCase": you need to use "myCustomCommand" on JS
  MyCustomCommand { argument: String },
  ExecuteDataStore {
    action: String,
    key: String,
    val: Option<String>,
    callback: String,
    error: String,
  }
}
