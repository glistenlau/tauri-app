use anyhow::Result;
use std::fs::OpenOptions;
use std::io::prelude::*;

pub fn append_file(path: &str, value: &str) -> Result<()> {
    let mut open_options = OpenOptions::new();
    let mut file = open_options.create(true).append(true).open(path)?;
    file.write_all(value.as_bytes())?;
    file.flush()?;
    Ok(())
}
