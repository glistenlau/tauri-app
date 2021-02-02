use std::{fs::create_dir_all, path::PathBuf};

use futures::channel::mpsc::unbounded;

const APP_FOLDER_NAME: &str = "APDatabaseDevTool";

pub fn get_data_dir() -> PathBuf {
    if let Some(mut dir) = dirs::data_dir() {
        dir.push(APP_FOLDER_NAME);
        if !dir.exists() {
            match create_dir_all(&dir) {
                Err(e) => {log::error!("create data dir failes: {}", e)},
                _ => ()
            };
        }
        return dir;
    }

    match tauri::api::platform::resource_dir() {
        Ok(path) => {
            path
        }
        Err(e) => {
            log::error!("Got error while trying to get the data dir: {}", e);
            PathBuf::from(".")
        }
    }
}