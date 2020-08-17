use anyhow::{anyhow, Result};
use glob::{glob_with, MatchOptions, Paths};
use std::collections::{HashMap, HashSet};

use crate::core::java_props::parse_prop_file;

pub fn search_files(searchPath: &str, filename: &str) -> Result<Paths> {
    let search_pattern = format!("{}/**/{}", searchPath, filename);
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

pub fn load_props(
    search_path: &str,
    classname: &str,
) -> Result<HashMap<String, HashMap<String, (Option<String>, Option<String>)>>> {
    let oracle_props = search_load_db_props(search_path, classname, ".oracle.properties")?;
    let postgres_props = search_load_db_props(search_path, classname, ".pg.properties")?;
    let mut combined: HashMap<String, HashMap<String, (Option<String>, Option<String>)>> =
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
            props_key_set.extend(m.keys());
        }

        let mut file_combiled_map = HashMap::new();

        for prop_key in props_key_set {
            let (mut ora_val, mut pg_val) = (None, None);

            if let Some(m) = ora_props_map {
                if let Some(prop_val) = m.get(prop_key) {
                    ora_val = Some(prop_val.clone());
                }
            }

            if let Some(m) = pg_props_map {
                if let Some(prop_val) = m.get(prop_key) {
                    pg_val = Some(prop_val.clone());
                }
            }

            file_combiled_map.insert(prop_key.clone(), (ora_val, pg_val));
        }

        combined.insert(String::from(filename_key), file_combiled_map);
    }

    Ok(combined)
}
