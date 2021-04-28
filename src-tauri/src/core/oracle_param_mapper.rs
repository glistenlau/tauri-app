use chrono::{DateTime, NaiveDate, NaiveDateTime, ParseError, Utc};
use oracle::{sql_type::ToSql, Connection};
use regex::Regex;
use serde_json::Value;

use crate::proxies::sql_common::SQLError;

static COLLECTION_PATTERN: &str = r"[^:]*CAST\s*\(\s*:[0-9]+\s*AS\s*(.*)\s*\)";
static PARAM_PATTERN: &str = r"(?:[^:]*:[0-9]+[^:]*)";
static START_PATTERN: &str = r"(?i)^\s*";

fn extract_collection_name(stmt: Option<&str>, pos: Option<usize>) -> Result<String, SQLError> {
    if None == stmt || None == pos {
        return Err(SQLError::new_str(
            "missing info to retrieve name of the collection type.",
        ));
    }

    let (stmt, pos) = (stmt.unwrap(), pos.unwrap());

    let mut pattern = String::from(START_PATTERN);
    if pos > 0 {
        pattern.push_str(PARAM_PATTERN);
        pattern.push_str(&format!("{{{}}}", pos));
    }

    pattern.push_str(COLLECTION_PATTERN);
    let re = match Regex::new(&pattern) {
        Ok(r) => r,
        Err(e) => {
            return Err(SQLError::new(format!(
                "collection regex pattern error: {}",
                e
            )));
        }
    };

    if let Some(cap) = re.captures(stmt) {
        return Ok(String::from(&cap[1]));
    }
    Err(SQLError::new(format!(
        "No collection found for parameter {}",
        pos
    )))
}

pub fn map_params(
    statement: Option<&str>,
    parameters: &[Value],
    conn: &Connection,
) -> Result<Vec<Box<dyn ToSql>>, SQLError> {
    let mut mapped_params = Vec::with_capacity(parameters.len());
    let params_iter = parameters.iter().enumerate();
    let mut mapped_param;

    for (index, param) in params_iter {
        mapped_param = map_param(statement, Some(index), param, conn)?;
        mapped_params.push(mapped_param);
    }

    Ok(mapped_params)
}

pub fn map_param(
    statement: Option<&str>,
    pos: Option<usize>,
    param: &Value,
    conn: &Connection,
) -> Result<Box<dyn ToSql>, SQLError> {
    let parsed_val = match param {
        Value::Number(val) => {
            if val.is_f64() {
                Box::new(val.as_f64().unwrap()) as Box<dyn ToSql>
            } else if val.is_u64() {
                Box::new(val.as_u64().unwrap()) as Box<dyn ToSql>
            } else {
                Box::new(val.as_i64().unwrap()) as Box<dyn ToSql>
            }
        }
        Value::Null => Box::new(Option::<String>::None) as Box<dyn ToSql>,
        Value::Bool(val) => Box::new(*val) as Box<dyn ToSql>,
        Value::String(val) => {
            // Try to parse it as timestamp.
            let timestamp_result: Result<Box<dyn ToSql>, ParseError> = val
                .parse::<NaiveDate>()
                .map(|date| Box::new(date) as Box<dyn ToSql>)
                .or(val
                    .parse::<NaiveDateTime>()
                    .map(|date_time| Box::new(date_time) as Box<dyn ToSql>))
                .or(val
                    .parse::<DateTime<Utc>>()
                    .map(|date_time| Box::new(date_time) as Box<dyn ToSql>));

            timestamp_result.unwrap_or(Box::new(val.to_string()) as Box<dyn ToSql>)
        }
        Value::Array(arr) => {
            let collection_name = extract_collection_name(statement, pos)?;
            let collection_type = conn.object_type(&collection_name)?;
            let mut collection = collection_type.new_collection()?;
            let mapped_arr = map_params(None, &arr, conn)?;

            for val in mapped_arr {
                collection.push(val.as_ref())?
            }

            Box::new(collection) as Box<dyn ToSql>
        }
        Value::Object(_) => return Err(SQLError::new_str("not support object param for oracle.")),
    };

    Ok(parsed_val)
}
