use chrono;

fn get_logger_path() -> String {
    match tauri::api::platform::resource_dir() {
        Ok(mut path) => {
            path.push("_log");
            return String::from(path.to_str().unwrap());
        }
        Err(e) => {
            println!("Got error while trying to get the resource dir: {}", e);
            return String::from("_data_store");
        }
    }
}

pub fn setup_logger() -> Result<(), fern::InitError> {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{}[{}][{}] {}",
                chrono::Local::now().format("[%Y-%m-%d][%H:%M:%S]"),
                record.target(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        // .chain(std::io::stdout())
        .chain(fern::log_file(get_logger_path())?)
        .apply()?;
    Ok(())
}
