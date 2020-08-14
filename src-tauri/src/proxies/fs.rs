use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::{ File, OpenOptions } ;
use std::io::prelude::*;
use anyhow::{anyhow, Result};
use crate::proxies::sql_common::{SQLClient, SQLReponse};

pub fn append_file(path: &str, value: &str) -> Result<()> {
  let mut openOptions = OpenOptions::new();
  let mut file = openOptions.create(true).append(true).open(path)?;
  file.write_all(value.as_bytes())?;
  file.flush()?;
  Ok(())
}
