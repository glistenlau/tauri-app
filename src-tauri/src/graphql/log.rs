use async_graphql::{Enum, Object, Result};

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
enum Level {
    Debug,
    Error,
    Info,
    Trace,
    Warn,
}

#[derive(Default)]
pub struct LogMutation;

#[Object]
impl LogMutation {
    async fn log(&self, target: Option<String>, level: Level, message: String) -> Result<bool> {
        let log_level = match level {
            Level::Debug => log::Level::Debug,
            Level::Error => log::Level::Error,
            Level::Info => log::Level::Info,
            Level::Trace => log::Level::Trace,
            Level::Warn => log::Level::Warn,
        };

        match target {
            Some(tar) => log::log!(target: &tar, log_level, "{}", message),
            None => log::log!(log_level, "{}", message),
        }

        Ok(true)
    }
}
