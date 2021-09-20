use std::{fs::create_dir_all, path::PathBuf};

const APP_FOLDER_NAME: &str = "APDatabaseDevTool";

pub fn get_data_dir() -> PathBuf {
    if let Some(mut dir) = dirs::data_dir() {
        dir.push(APP_FOLDER_NAME);
        if !dir.exists() {
            match create_dir_all(&dir) {
                Err(e) => {
                    log::error!("create data dir failes: {}", e)
                }
                _ => (),
            };
        }
        return dir;
    }

    PathBuf::from(".")
}
