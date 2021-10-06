use crate::core::{
    db_schema_processor::{process_xml_tag, TreeNode},
    xml_parser::parse_xml,
};

use async_graphql::*;

use serde::{Deserialize, Serialize};
use serde_json::to_string;
use std::{fs::File, io::Read};

use super::fs::search_files;
use crate::proxies::rocksdb::{get_conn, RocksDataStore};

use crate::core::db_schema_processor::FlatNode;
use anyhow::Result;
use std::time::Instant;

#[derive(SimpleObject, Serialize, Deserialize, Debug)]
pub struct SchemaFile {
    path: String,
    root: TreeNode,
}

#[derive(SimpleObject, Serialize, Deserialize, Debug)]
pub struct FlatSchemaFile {
    path: String,
    nodes: Vec<FlatNode>,
}

#[derive(InputObject, Serialize, Deserialize, Debug)]
pub struct Range {
    pub start: usize,
    pub end: usize,
}

fn flat_tree_node(root: &TreeNode, file_index: usize) -> Vec<FlatNode> {
    let mut res: Vec<FlatNode> = vec![];

    flat_parent_tree_node(
        root,
        Option::None,
        0,
        file_index,
        &file_index.to_string(),
        &mut res,
    );
    res
}

fn flat_parent_tree_node(
    parent: &TreeNode,
    grand_parent_index: Option<usize>,
    nesting_level: usize,
    file_index: usize,
    grand_parent_id: &str,
    results: &mut Vec<FlatNode>,
) {
    let mut flat_node = FlatNode::from(parent);
    flat_node.update_parent_index(grand_parent_index);
    flat_node.update_nesting_level(nesting_level);
    flat_node.update_file_index(file_index);
    results.push(flat_node);

    let parent_index: usize = results.len() - 1;
    let parent_id = format!("{}-{}", grand_parent_id, parent_index);

    for child in parent.get_children() {
        let child_index = results.len();
        results[parent_index].add_child_index(child_index);
        flat_parent_tree_node(
            child,
            Some(parent_index),
            nesting_level + 1,
            file_index,
            &parent_id,
            results,
        );
    }

    results[parent_index].set_id(parent_id);
}

pub fn search_db_schema_flat(
    search_folder: &str,
    file_pattern: &str,
) -> Result<Vec<FlatSchemaFile>> {
    let now = Instant::now();
    let tree_res = search_db_schema(search_folder, file_pattern);

    let checkpoint = now.elapsed();
    log::debug!("search db schema takes: {:?}", checkpoint);
    let flat_res = tree_res.map(|schema_files| {
        schema_files
            .iter()
            .enumerate()
            .map(|(file_index, schema_file)| FlatSchemaFile {
                path: schema_file.path.to_owned(),
                nodes: flat_tree_node(&schema_file.root, file_index),
            })
            .collect()
    });
    log::debug!("flatten db schema takes: {:?}", now.elapsed() - checkpoint);

    flat_res
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

        let mut conn_lock = get_conn();

        let mut root_tree_node = process_xml_tag(&xml_root_tag);
        root_tree_node.update_tag_name(path.file_name().unwrap().to_str().unwrap().to_string());
        let schema_file = SchemaFile {
            path: path_str.to_string(),
            root: root_tree_node,
        };

        let schema_file_key = get_schema_file_store_key(&path_str);
        let schema_file_str = to_string(&schema_file)?;

        let key_vals: Vec<(&str, &str)> =
            vec![(&path_str, &file_str), (&schema_file_key, &schema_file_str)];

        // save the file value and tree into data store
        RocksDataStore::write_batch("db_schema", &key_vals, &mut conn_lock)?;
        res.push(schema_file);
    }

    res.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(res)
}

pub fn get_schema_file_store_key(file_path: &str) -> String {
    format!("SchemaFile#{}", file_path)
}

#[cfg(test)]
mod tests {
    use std::env;

    use super::*;

    #[test]
    fn test_search_db_schema() {
        let planning_path = env::var("PLANNING_PATH").unwrap();
        assert!(planning_path.len() > 0, "Should have planning path.");

        match search_db_schema(&planning_path, "/src/db/*.xml") {
            Ok(res) => {
                print!("res: {:?}", res)
            }
            Err(e) => {
                panic!("shouldn't have error: {}", e)
            }
        }
    }

    #[test]
    fn test_search_db_schema_flat() {
        let planning_path = env::var("PLANNING_PATH").unwrap();
        assert!(planning_path.len() > 0, "Should have planning path.");

        match search_db_schema_flat(&planning_path, "/src/db/*.xml") {
            Ok(res) => {
                print!("res: {:?}", res)
            }
            Err(e) => {
                panic!("shouldn't have error: {}", e)
            }
        }
    }
}
