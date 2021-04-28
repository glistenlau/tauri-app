use std::fmt::Display;

use anyhow::{anyhow, Result};
use chrono::DateTime;
use chrono::Local;
use chrono::NaiveDate;
use chrono::NaiveDateTime;
use chrono::NaiveTime;
use regex::Regex;
use serde_json::{json, Value};
use tokio_postgres::types::Type;
use tokio_postgres::Row;
use tokio_postgres::{row::RowIndex, Column};
use uuid::Uuid;

use crate::proxies::sql_common::{process_statement_params, process_statement_schema};

static ARRAY_PATTERN: &str = r"(?i)(array\t*\[\t*\?\t*\](?:\t*::\t*anaconda\.[a-z]+)?)";

pub fn process_statement_array(statement: &str) -> Result<String> {
    let re = Regex::new(ARRAY_PATTERN)?;
    Ok(re.replace_all(statement, "?").to_string())
}

pub fn process_statement(statement: &str, schema: &str) -> Result<String> {
    let mut result = process_statement_array(statement)?;
    result = process_statement_params(&result, "$");

    Ok(process_statement_schema(&result, schema))
}

pub fn get_row_values(row: &Row, columns: &[Column]) -> Result<Vec<Value>> {
    let mut row_values = Vec::with_capacity(columns.len());
    for (index, column) in columns.iter().enumerate() {
        row_values.push(get_cell_value(row, index, column.type_())?);
    }

    Ok(row_values)
}

pub fn get_cell_value<I>(row: &Row, idx: I, sql_type: &Type) -> Result<Value>
where
    I: RowIndex + Display,
{
    let cell_val;

    match sql_type.kind() {
        tokio_postgres::types::Kind::Simple => {
            if *sql_type == Type::BOOL {
                let val: Option<bool> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::CHAR {
                let val: Option<i8> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::INT2 {
                let val: Option<i16> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::INT4 {
                let val: Option<i32> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::INT8 {
                let val: Option<i64> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::FLOAT4 {
                let val: Option<f32> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::FLOAT8 {
                let val: Option<f64> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::BYTEA {
                let val: Option<Vec<u8>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *sql_type == Type::TIMESTAMP {
                let val: Option<NaiveDateTime> = row.try_get(idx)?;
                match val {
                    Some(timestamp_val) => cell_val = json!(timestamp_val.to_string()),
                    None => cell_val = json!(Option::<String>::None),
                }
            } else if *sql_type == Type::TIMESTAMPTZ {
                let val: Option<DateTime<Local>> = row.try_get(idx)?;
                match val {
                    Some(timestamptz_val) => cell_val = json!(timestamptz_val.to_string()),
                    None => cell_val = json!(Option::<String>::None),
                }
            } else if *sql_type == Type::DATE {
                let val: Option<NaiveDate> = row.try_get(idx)?;
                match val {
                    Some(date_val) => cell_val = json!(date_val.to_string()),
                    None => cell_val = json!(Option::<String>::None),
                }
            } else if *sql_type == Type::TIME {
                let val: Option<NaiveTime> = row.try_get(idx)?;
                match val {
                    Some(time_val) => cell_val = json!(time_val.to_string()),
                    None => cell_val = json!(Option::<String>::None),
                }
            } else if *sql_type == Type::UUID {
                let val: Option<Uuid> = row.try_get(idx)?;
                match val {
                    Some(uuid_val) => cell_val = json!(uuid_val.to_string()),
                    None => cell_val = json!(Option::<String>::None),
                };
            } else {
                let val: Option<String> = row.try_get(idx)?;
                cell_val = json!(val)
            }
        }
        tokio_postgres::types::Kind::Array(element_type) => {
            if *element_type == Type::BOOL {
                let val: Option<Vec<Option<bool>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::CHAR {
                let val: Option<Vec<Option<i8>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::INT2 {
                let val: Option<Vec<Option<i16>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::INT4 {
                let val: Option<Vec<Option<i32>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::INT8 {
                let val: Option<Vec<Option<i64>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::FLOAT4 {
                let val: Option<Vec<Option<f32>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::FLOAT8 {
                let val: Option<Vec<Option<f64>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::BYTEA {
                let val: Option<Vec<Option<Vec<u8>>>> = row.try_get(idx)?;
                cell_val = json!(val);
            } else if *element_type == Type::TIMESTAMP {
                let val: Option<Vec<Option<NaiveDateTime>>> = row.try_get(idx)?;
                let mapped_val: Option<Vec<Option<String>>> = val.map(|timestamp_arr| {
                    timestamp_arr
                        .iter()
                        .map(|timestamp_opt| {
                            timestamp_opt.map(|timestamp_val| timestamp_val.to_string())
                        })
                        .collect()
                });
                cell_val = json!(mapped_val);
            } else if *element_type == Type::TIMESTAMPTZ {
                let val: Option<Vec<Option<DateTime<Local>>>> = row.try_get(idx)?;
                let mapped_val: Option<Vec<Option<String>>> = val.map(|timestamptz_arr| {
                    timestamptz_arr
                        .iter()
                        .map(|timestamptz_opt| {
                            timestamptz_opt.map(|timestamptz_val| timestamptz_val.to_string())
                        })
                        .collect()
                });
                cell_val = json!(mapped_val);
            } else if *element_type == Type::DATE {
                let val: Option<Vec<Option<NaiveDate>>> = row.try_get(idx)?;
                let mapped_val: Option<Vec<Option<String>>> = val.map(|date_arr| {
                    date_arr
                        .iter()
                        .map(|date_opt| date_opt.map(|date_val| date_val.to_string()))
                        .collect()
                });
                cell_val = json!(mapped_val);
            } else if *element_type == Type::TIME {
                let val: Option<Vec<Option<NaiveTime>>> = row.try_get(idx)?;
                let mapped_val: Option<Vec<Option<String>>> = val.map(|time_arr| {
                    time_arr
                        .iter()
                        .map(|time_opt| time_opt.map(|time_val| time_val.to_string()))
                        .collect()
                });
                cell_val = json!(mapped_val);
            } else if *element_type == Type::UUID {
                let val: Option<Vec<Option<Uuid>>> = row.try_get(idx)?;
                let mapped_val: Option<Vec<Option<String>>> = val.map(|uuid_arr| {
                    uuid_arr
                        .iter()
                        .map(|uuid_opt| uuid_opt.map(|uuid_val| uuid_val.to_string()))
                        .collect()
                });
                cell_val = json!(mapped_val);
            } else {
                let val: Option<Vec<Option<String>>> = row.try_get(idx)?;
                cell_val = json!(val)
            }
        }
        _ => {
            return Err(anyhow!(
                "convert from sql error: not support sql type: {}",
                sql_type
            ));
        }
    }

    Ok(cell_val)
}
