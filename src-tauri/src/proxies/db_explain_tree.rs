use std::{
    any,
    borrow::Cow,
    collections::HashMap,
    fs::{File, OpenOptions},
    io::Read,
};

use async_graphql::*;

use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};

#[derive(Debug)]
enum COLUMNS {
    Id,
    Operation,
    Name,
    Starts,
    ERows,
    ARows,
    ATime,
    Buffers,
    OMem,
    OneMem,
    UsedMem,
    Empty,
}

#[derive(SimpleObject, Serialize, Debug, Deserialize, Default)]
pub struct ExplainRow {
    id: i32,
    operation: String,
    level: i32,
    name: Option<String>,
    starts: i32,
    e_rows: Option<i32>,
    a_rows: Option<i32>,
    a_time: Option<String>,
    buffers: String,
    has_children: bool,
    o_mem: Option<String>,
    one_mem: Option<String>,
    used_mem: Option<String>,
    predicate_information: Option<String>,
    children: Option<Vec<ExplainRow>>,
}

impl ExplainRow {
    fn new() -> Self {
        ExplainRow::default()
    }

    fn push_child(&mut self, child: ExplainRow) {
        self.has_children = true;
        if self.children.is_none() {
            self.children = Some(vec![]);
        }
        self.children.as_mut().unwrap().push(child);
    }
}

lazy_static! {
    static ref STRING_TO_COLUMN_MAP: HashMap<&'static str, COLUMNS> = vec![
        ("id", COLUMNS::Id),
        ("operation", COLUMNS::Operation),
        ("name", COLUMNS::Name),
        ("starts", COLUMNS::Starts),
        ("e-rows", COLUMNS::ERows),
        ("a-rows", COLUMNS::ARows),
        ("a-time", COLUMNS::ATime),
        ("buffers", COLUMNS::Buffers),
        ("omem", COLUMNS::OMem),
        ("1mem", COLUMNS::OneMem),
        ("used-mem", COLUMNS::UsedMem),
    ]
    .into_iter()
    .collect();
}

pub fn parse_db_explain(text: &str) -> Vec<ExplainRow> {
    let mut results = vec![];
    let mut columns: Vec<&COLUMNS> = vec![];
    let root_level: i32 = 1;

    for line in text.lines() {
        let line_trim = line.trim();
        if !line_trim.starts_with("|") {
            continue;
        }
        let is_column_header = columns.len() == 0;
        let mut row = ExplainRow::new();
        let mut has_data = false;
        for (index, cell_val) in line_trim.split("|").enumerate() {
            if is_column_header {
                let column_opt = STRING_TO_COLUMN_MAP.get(&cell_val.trim().to_lowercase() as &str);
                match column_opt {
                    Some(column) => {
                        has_data = true;
                        columns.push(column)
                    }
                    None => columns.push(&COLUMNS::Empty),
                }
            } else {
                let column_opt = columns.get(index);
                match column_opt {
                    Some(COLUMNS::Id) => {
                        let cell_val_trim = cell_val.trim();
                        let digit_opt = cell_val_trim.find(|c: char| c.is_digit(10));
                        let id: i32 = match digit_opt {
                            None => {
                                continue;
                            }
                            Some(digit_index) => match cell_val_trim[digit_index..].parse() {
                                Ok(number) => number,
                                Err(e) => {
                                    log::error!("parse id error: {}", e);
                                    continue;
                                }
                            },
                        };
                        row.id = id;
                        has_data = true;
                    }
                    Some(COLUMNS::Operation) => {
                        row.operation = cell_val.trim().to_string();
                        match cell_val.find(char::is_alphanumeric) {
                            None => {}
                            Some(level) => {
                                row.level = (level as i32) - root_level;
                            }
                        }
                    }
                    Some(COLUMNS::Name) => row.name = Some(cell_val.trim().to_string()),
                    Some(COLUMNS::Starts) => {
                        row.starts = match cell_val.trim().parse() {
                            Err(e) => {
                                log::error!("parse Starts error: {}", e);
                                continue;
                            }
                            Ok(starts) => starts,
                        }
                    }
                    Some(COLUMNS::ERows) => {
                        row.e_rows = Some(match cell_val.trim().parse() {
                            Err(e) => {
                                log::error!("parse A-Rows error: {}", e);
                                continue;
                            }
                            Ok(e_rows) => e_rows,
                        })
                    }
                    Some(COLUMNS::ARows) => {
                        row.a_rows = Some(match cell_val.trim().parse() {
                            Err(e) => {
                                log::error!("parse A-Rows error: {}", e);
                                continue;
                            }
                            Ok(a_rows) => a_rows,
                        });
                    }
                    Some(COLUMNS::ATime) => {
                        row.a_time = Some(cell_val.trim().to_string());
                    }
                    Some(COLUMNS::Buffers) => {
                        row.buffers = cell_val.trim().to_string();
                    }
                    Some(COLUMNS::OMem) => {
                        row.o_mem = Some(cell_val.trim().to_string());
                    }
                    Some(COLUMNS::OneMem) => {
                        row.one_mem = Some(cell_val.trim().to_string());
                    }
                    Some(COLUMNS::UsedMem) => {
                        row.used_mem = Some(cell_val.trim().to_string());
                    }
                    _ => {}
                }
            }
        }

        if !has_data {
            if is_column_header {
                columns.clear();
            }
            continue;
        }

        if !is_column_header {
            results.push(row);
        }
    }

    log::debug!("columns: {:#?}", columns);

    results
}