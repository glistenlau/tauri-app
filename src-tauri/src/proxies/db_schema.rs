use crate::core::{
    db_schema_processor::{process_xml_tag, TreeNode},
    xml_parser::parse_xml,
};
use futures::channel::mpsc::unbounded;
use juniper::{
    graphql_object, EmptySubscription, FieldResult, GraphQLEnum, GraphQLInputObject, GraphQLObject,
    ScalarValue,
};
use serde::{Deserialize, Serialize};
use serde_json::to_string;
use std::{
    any,
    borrow::Cow,
    fs::{File, OpenOptions},
    io::Read,
};

use super::fs::search_files;
use super::rocksdb::{get_proxy, RocksDataStore};

use anyhow::Result;

#[derive(GraphQLObject, Serialize, Deserialize)]
pub struct SchemaFile {
    path: String,
    root: TreeNode,
}

pub fn search_db_schema(search_folder: &str, file_pattern: &str) -> Result<Vec<SchemaFile>> {
    let filepaths = search_files(&format!("{}/{}", search_folder, file_pattern))?;
    let mut res: Vec<SchemaFile> = vec![];

    for path_res in filepaths {
        if path_res.is_err() {
            continue;
        }
        let path = path_res.unwrap();
        let path_str = path.to_string_lossy().to_string();

        let mut file = File::open(&path)?;
        let mut file_str = String::new();
        if let Err(e) = file.read_to_string(&mut file_str) {
            log::debug!("read file error for file: {:?}. {}", path, e);
            continue;
        }

        let xml_root_tag = match parse_xml(&file_str) {
            Ok(xml_tag) => xml_tag,
            Err(e) => {
                log::debug!("parse xml error for file: {:?}. {}", path, e);
                continue;
            }
        };

        let conn = get_proxy().lock().unwrap().get_conn()?;
        let mut conn_lock = conn.lock().unwrap();

        let root_tree_node = process_xml_tag(&xml_root_tag);
        let schema_file = SchemaFile {
            path: path_str.to_string(),
            root: root_tree_node,
        };

        // save the file value and tree into data store
        RocksDataStore::write_batch(
            &mut conn_lock,
            "db_schema",
            vec![
                (path_str.to_string(), file_str),
                (
                    format!("SchemaFile#{}", &path_str),
                    to_string(&schema_file)?,
                ),
            ],
        )?;
        res.push(schema_file);
    }

    res.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(res)
}

#[cfg(test)]
mod tests {
    use regex::{escape, Regex};
    use std::time::Instant;
    use std::{fs::File, io::Read};

    use glob::glob;

    use super::*;

    #[test]
    fn test_xml_parser() {
        let planning_path = env!("PLANNING_PATH");
        assert!(planning_path.len() > 0, "Should have planning path.");

        match search_db_schema(planning_path, "/src/db/*.xml") {
            Ok(res) => {
                println!("got {} res", res.len());
            }
            Err(e) => {
                panic!("shouldn't have error: {}", e)
            }
        }
    }
}
