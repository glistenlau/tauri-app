use std::path::PathBuf;

use chrono;

use crate::proxies::dirs::get_data_dir;

fn get_path() -> PathBuf {
    let mut data_path = get_data_dir();
    data_path.push("_log");
    data_path
}

pub fn setup_logger() -> Result<(), fern::InitError> {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{}[{:?}][{}][{}] {}",
                chrono::Local::now().format("[%Y-%m-%d][%H:%M:%S]"),
                std::thread::current().id(),
                record.target(),
                record.level(),
                message
            ))
        })
        .level(log::LevelFilter::Debug)
        .chain(std::io::stdout())
        .chain(fern::log_file(get_path())?)
        .apply()?;
    Ok(())
}
