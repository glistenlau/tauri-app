use std::fs::OpenOptions;
use std::io::prelude::*;

use anyhow::{anyhow, Result};
use glob::{glob_with, MatchOptions, Paths};

pub fn append_file(path: &str, value: &str) -> Result<()> {
    let mut open_options = OpenOptions::new();
    let mut file = open_options.create(true).append(true).open(path)?;
    file.write_all(value.as_bytes())?;
    file.flush()?;
    Ok(())
}

pub fn search_files(search_pattern: &str) -> Result<Paths> {
    let options = MatchOptions {
        case_sensitive: false,
        require_literal_separator: false,
        require_literal_leading_dot: false,
    };

    match glob_with(&search_pattern, options) {
        Ok(paths) => Ok(paths),
        Err(e) => Err(anyhow!("glob {} failed: {}", &search_pattern, e)),
    }
}
