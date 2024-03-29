use std::collections::{HashMap, HashSet};

use anyhow::{anyhow, Result};
use async_graphql::{Enum, Json, SimpleObject};
use glob::{glob_with, MatchOptions, Paths};
use serde::{Deserialize, Serialize};

use crate::core::java_props::{parse_prop_file, save_prop};

use super::sql_common::SQLError;

pub fn search_files(search_path: &str, filename: &str) -> Result<Paths> {
    let search_pattern = format!("{}/**/{}", search_path, filename);
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

pub fn search_load_props(
    search_path: &str,
    filename: &str,
) -> Result<HashMap<String, HashMap<String, String>>> {
    let files: Paths = search_files(search_path, filename)?;
    let mut map: HashMap<String, HashMap<String, String>> = HashMap::new();

    for entry in files {
        match entry {
            Ok(path) => {
                let path_str = String::from(path.to_str().unwrap());
                map.insert(path_str.clone(), parse_prop_file(&path_str)?);
            }
            Err(e) => log::error!("iterate file path error: {:?}", e),
        }
    }

    Ok(map)
}

fn search_load_db_props(
    search_path: &str,
    classname: &str,
    suffix: &str,
) -> Result<HashMap<String, HashMap<String, String>>> {
    let filename = format!("{}{}", classname, suffix);
    let props = search_load_props(search_path, &filename)?;
    let mut general_props = HashMap::with_capacity(props.len());
    for (key, val) in props {
        let general_key = String::from(key.trim_end_matches(suffix));
        general_props.insert(general_key, val);
    }

    Ok(general_props)
}

pub fn save_java_prop(filepath: &str, prop_key: &str, prop_value: &str) -> Result<()> {
    save_prop(filepath, prop_key, prop_value)?;
    Ok(())
}

#[derive(Clone, Copy, Enum, Eq, PartialEq, Hash, Serialize, Deserialize)]
pub enum PropValStatus {
    OracleOnly,
    PostgresOnly,
    Both,
    Neither,
}

#[derive(Clone, Copy, Enum, Eq, PartialEq, Hash, Serialize, Deserialize)]
pub enum ValidationStatus {
    Pass,
    Error,
    Warning,
}

#[derive(Clone, Eq, PartialEq, Hash, SimpleObject, Serialize, Deserialize)]
pub struct PropKey {
    pub name: String,
    pub val_status: PropValStatus,
    pub validation_status: Option<ValidationStatus>,
}

#[derive(Clone, SimpleObject, Serialize, Deserialize)]
pub struct PropVal {
    pub value_pair: Vec<String>,
    pub validation_error: Vec<Json<Option<SQLError>>>,
}

impl PropVal {
    pub fn new() -> Self {
        Self {
            value_pair: vec![String::new(), String::new()],
            validation_error: vec![],
        }
    }
}

pub fn load_props(
    search_path: &str,
    classname: &str,
) -> Result<HashMap<String, HashMap<PropKey, PropVal>>> {
    let oracle_props = search_load_db_props(search_path, classname, ".oracle.properties")?;
    let postgres_props = search_load_db_props(search_path, classname, ".pg.properties")?;

    let mut combined: HashMap<String, HashMap<PropKey, PropVal>> =
        HashMap::with_capacity(oracle_props.len());
    let mut filename_key_set = HashSet::with_capacity(oracle_props.len());
    filename_key_set.extend(oracle_props.keys());
    filename_key_set.extend(postgres_props.keys());

    for filename_key in filename_key_set {
        let ora_props_map = oracle_props.get(filename_key);
        let pg_props_map = postgres_props.get(filename_key);
        let mut props_key_set = HashSet::new();
        if let Some(m) = ora_props_map {
            props_key_set.extend(m.keys());
        }

        if let Some(m) = pg_props_map {
            props_key_set.extend(m.keys().filter(|pk| !pk.to_lowercase().ends_with(".md5")));
        }

        let mut file_combiled_map = HashMap::new();

        for prop_key in props_key_set {
            let (mut ora_val, mut pg_val) = (String::new(), String::new());

            if let Some(m) = ora_props_map {
                if let Some(prop_val) = m.get(prop_key) {
                    ora_val = prop_val.clone();
                }
            }

            if let Some(m) = pg_props_map {
                if let Some(prop_val) = m.get(prop_key) {
                    pg_val = prop_val.clone();
                }
            }

            let val_status = if !ora_val.is_empty() && !pg_val.is_empty() {
                PropValStatus::Both
            } else if !ora_val.is_empty() {
                PropValStatus::OracleOnly
            } else if !pg_val.is_empty() {
                PropValStatus::PostgresOnly
            } else {
                PropValStatus::Neither
            };

            let prop_key_obj = PropKey {
                name: prop_key.clone(),
                val_status,
                validation_status: None,
            };
            let prop_val_obj = PropVal {
                value_pair: vec![ora_val, pg_val],
                validation_error: vec![],
            };

            file_combiled_map.insert(prop_key_obj, prop_val_obj);
        }

        combined.insert(String::from(filename_key), file_combiled_map);
    }

    Ok(combined)
}
