use super::xml_parser::XmlTag;

use async_graphql::*;

use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, collections::HashMap, rc::Rc};
#[derive(Enum, Clone, Copy, Eq, PartialEq, Deserialize, Serialize, Debug)]
enum DbFamily {
    Oracle,
    Postgres,
    Both,
}

struct Node {
    db_family: Option<DbFamily>,
    start: usize,
    end: usize,
    tag_name: String,
    name_attr: Option<String>,
    children: Vec<Rc<Node>>,
}

impl Node {
    fn new(
        db_family: Option<DbFamily>,
        start: usize,
        end: usize,
        tag_name: String,
        name_attr: Option<String>,
        children: Vec<Rc<Node>>,
    ) -> Self {
        Node {
            db_family,
            start,
            end,
            tag_name,
            name_attr,
            children,
        }
    }
}

#[derive(Clone, SimpleObject, Serialize, Deserialize, Debug)]
pub struct NodeValue {
    start: i32,
    end: i32,
    db_family: Option<DbFamily>,
}

#[derive(SimpleObject, Deserialize, Serialize, Debug)]
pub struct FlatNode {
    id: String,
    tag_name: String,
    name_attr: Option<String>,
    values: Vec<NodeValue>,
    db_family: Option<DbFamily>,
    parent_index: Option<usize>,
    child_indexes: Option<Vec<usize>>,
    nesting_level: usize,
    file_index: usize,
}

impl From<&TreeNode> for FlatNode {
    fn from(tree_node: &TreeNode) -> Self {
        FlatNode {
            id: String::new(),
            tag_name: tree_node.tag_name.to_string(),
            name_attr: tree_node.name_attr.to_owned(),
            values: tree_node.values.to_owned(),
            db_family: tree_node.db_family.to_owned(),
            parent_index: Option::None,
            child_indexes: Option::None,
            nesting_level: 0,
            file_index: 0,
        }
    }
}

impl FlatNode {
    pub fn update_parent_index(&mut self, parent_index: Option<usize>) {
        self.parent_index = parent_index;
    }

    pub fn add_child_index(&mut self, child_index: usize) {
        if self.child_indexes.is_none() {
            self.child_indexes = Some(Vec::new());
        }

        self.child_indexes.as_mut().unwrap().push(child_index);
    }

    pub fn update_nesting_level(&mut self, nesting_level: usize) {
        self.nesting_level = nesting_level;
    }

    pub fn update_file_index(&mut self, file_index: usize) {
        self.file_index = file_index;
    }

    pub fn set_id(&mut self, id: String) {
        self.id = id;
    }
}

#[derive(SimpleObject, Deserialize, Serialize, Debug)]
pub struct TreeNode {
    tag_name: String,
    name_attr: Option<String>,
    values: Vec<NodeValue>,
    children: Vec<TreeNode>,
    db_family: Option<DbFamily>,
}

impl TreeNode {
    fn new(nodes: Vec<Rc<Node>>, children: Vec<TreeNode>, db_family: Option<DbFamily>) -> Self {
        let values = nodes
            .iter()
            .map(|node| NodeValue {
                start: node.start as i32,
                end: node.end as i32,
                db_family: node.db_family,
            })
            .collect();
        TreeNode {
            tag_name: nodes[0].tag_name.to_string(),
            name_attr: nodes[0].name_attr.clone(),
            values,
            children,
            db_family,
        }
    }

    pub fn get_children(&self) -> &Vec<TreeNode> {
        &self.children
    }

    pub fn update_tag_name(&mut self, tag_name: String) {
        self.tag_name = tag_name;
    }
}

impl From<&XmlTag> for Node {
    fn from(tag: &XmlTag) -> Self {
        let name_attr = tag.attrs().get("name").map(|name| name.to_string());
        let tag_name = format!("<{}>", tag.tag_name().to_string());
        let (start, end) = tag.range();
        let children: Vec<Rc<Node>> = tag
            .children()
            .iter()
            .map(|child| Rc::new(child.into()))
            .collect();
        let db_family = identify_db_type(tag);

        Node::new(db_family, start, end, tag_name, name_attr, children)
    }
}

fn identify_db_type(node: &XmlTag) -> Option<DbFamily> {
    let node_db_family = node.attrs().get("family");
    if let Some(db_family_str) = node_db_family {
        let db_family_str_lower = db_family_str.to_lowercase();
        if db_family_str_lower.contains("oracle") {
            return Some(DbFamily::Oracle);
        }
        if db_family_str_lower.contains("postgres") {
            return Some(DbFamily::Postgres);
        }

        return Some(DbFamily::Both);
    }

    None
}

fn generate_tree_node(node: Rc<Node>, parent_db_family: Option<DbFamily>) -> TreeNode {
    let mut name_to_nodes_map: HashMap<String, Vec<Rc<Node>>> =
        HashMap::with_capacity(node.children.len());
    let effective_db_family = if node.db_family.is_none() {
        parent_db_family
    } else {
        node.db_family
    };

    insert_nodes_to_name_to_nodes_map(&node.children, &mut name_to_nodes_map);

    let children = reduce_to_child_tree_nodes(name_to_nodes_map, effective_db_family);

    TreeNode::new(vec![node], children, effective_db_family)
}

fn combine_nodes(nodes: &[Rc<Node>]) -> TreeNode {
    let mut name_to_nodes_map: HashMap<String, Vec<Rc<Node>>> = HashMap::new();
    nodes
        .iter()
        .for_each(|node| insert_nodes_to_name_to_nodes_map(&node.children, &mut name_to_nodes_map));

    let mut children = reduce_to_child_tree_nodes(name_to_nodes_map, Some(DbFamily::Both));
    children.sort_by(tree_node_sort_fn);

    TreeNode::new(nodes.into(), children, Some(DbFamily::Both))
}

fn reduce_to_child_tree_nodes(
    mut name_to_nodes_map: HashMap<String, Vec<Rc<Node>>>,
    panrent_db_family: Option<DbFamily>,
) -> Vec<TreeNode> {
    let mut children: Vec<TreeNode> = name_to_nodes_map
        .drain()
        .map(|(_, nodes)| {
            if nodes.len() > 1 {
                combine_nodes(&nodes)
            } else {
                generate_tree_node(Rc::clone(&nodes[0]), panrent_db_family)
            }
        })
        .collect();

    children.sort_by(tree_node_sort_fn);

    children
}

fn tree_node_sort_fn(a: &TreeNode, b: &TreeNode) -> Ordering {
    if a.tag_name.eq(&b.tag_name) {
        return a.name_attr.cmp(&b.name_attr);
    }
    a.tag_name.cmp(&b.tag_name)
}

fn insert_nodes_to_name_to_nodes_map(
    nodes: &[Rc<Node>],
    name_to_nodes_map: &mut HashMap<String, Vec<Rc<Node>>>,
) {
    for child in nodes {
        let key = if let Some(name) = &child.name_attr {
            format!("{}-{}", child.tag_name, name)
        } else {
            child.tag_name.to_string()
        };

        if let Some(nodes) = name_to_nodes_map.get_mut(&key) {
            nodes.push(Rc::clone(child));
        } else {
            let nodes = vec![Rc::clone(child)];
            name_to_nodes_map.insert(key, nodes);
        }
    }
}

pub fn process_xml_tag(tag: &XmlTag) -> TreeNode {
    let root_node: Rc<Node> = Rc::new(tag.into());
    generate_tree_node(root_node, None)
}
