use std::collections::HashMap;

use anyhow::Result;
use chrono::{DateTime, Local, NaiveDateTime, Utc};
use oracle::{
    sql_type::{Collection, Object, OracleType},
    ColumnIndex, ColumnInfo, Row,
};
use serde_json::{json, Value};

use crate::proxies::sql_common::{process_statement_params, process_statement_schema};

pub fn process_statement(statement: &str, schema: &str) -> Result<String> {
    let result = process_statement_params(statement, ":");

    Ok(process_statement_schema(&result, schema))
}

pub fn get_row_values(row: &Row, columns: &[ColumnInfo]) -> Result<Vec<Value>> {
    let mut row_values = Vec::with_capacity(columns.len());
    for (index, column) in columns.iter().enumerate() {
        row_values.push(get_cell_value(row, index, column.oracle_type())?);
    }

    Ok(row_values)
}

pub fn get_cell_value<I>(row: &Row, idx: I, sql_type: &OracleType) -> Result<Value>
where
    I: ColumnIndex,
{
    let json_val = match sql_type {
        OracleType::Number(_, _) => {
            let val: Option<i64> = row.get(idx)?;
            json!(val)
        }
        OracleType::Float(_) => {
            let val: Option<f64> = row.get(idx)?;
            json!(val)
        }
        OracleType::Date => {
            let val: Option<NaiveDateTime> = row.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Timestamp(_) => {
            let val: Option<NaiveDateTime> = row.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampTZ(_) => {
            let val: Option<DateTime<Utc>> = row.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampLTZ(_) => {
            let val: Option<DateTime<Local>> = row.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Boolean => {
            let val: Option<bool> = row.get(idx)?;
            json!(val)
        }
        OracleType::Int64 => {
            let val: Option<i64> = row.get(idx)?;
            json!(val)
        }
        OracleType::UInt64 => {
            let val: Option<u64> = row.get(idx)?;
            json!(val)
        }
        OracleType::Object(object_type) => {
            if object_type.is_collection() {
                let collection_opt: Option<Collection> = row.get(idx)?;
                match collection_opt {
                    Some(collection) => {
                        let mut arr = Vec::with_capacity(collection.size()? as usize);
                        let mut idx = collection.first_index()?;
                        loop {
                            arr.push(get_collection_value(
                                &collection,
                                idx,
                                collection.object_type().element_oracle_type().unwrap(),
                            )?);
                            match collection.next_index(idx) {
                                Ok(next_idx) => idx = next_idx,
                                Err(_) => {
                                    break;
                                }
                            }
                        }

                        json!(arr)
                    }
                    None => json!(Option::<Vec<Value>>::None),
                }
            } else {
                let object_opt: Option<Object> = row.get(idx)?;
                match object_opt {
                    Some(object) => {
                        let object_type = object.object_type();
                        let attributes = object_type.attributes();
                        let mut map = HashMap::with_capacity(attributes.len());

                        for attribute in attributes {
                            let key = attribute.name();
                            let val = get_object_value(&object, key, attribute.oracle_type())?;
                            map.insert(key, val);
                        }

                        json!(map)
                    }
                    None => json!(Option::<HashMap<String, Value>>::None),
                }
            }
        }
        _ => {
            let val: Option<String> = row.get(idx)?;
            json!(val)
        }
    };

    Ok(json_val)
}

pub fn get_collection_value(
    collection: &Collection,
    idx: i32,
    sql_type: &OracleType,
) -> Result<Value> {
    let json_val = match sql_type {
        OracleType::Number(_, _) => {
            let val: Option<i64> = collection.get(idx)?;
            json!(val)
        }
        OracleType::Float(_) => {
            let val: Option<f64> = collection.get(idx)?;
            json!(val)
        }
        OracleType::Date => {
            let val: Option<NaiveDateTime> = collection.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Timestamp(_) => {
            let val: Option<NaiveDateTime> = collection.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampTZ(_) => {
            let val: Option<DateTime<Utc>> = collection.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampLTZ(_) => {
            let val: Option<DateTime<Local>> = collection.get(idx)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Boolean => {
            let val: Option<bool> = collection.get(idx)?;
            json!(val)
        }
        OracleType::Int64 => {
            let val: Option<i64> = collection.get(idx)?;
            json!(val)
        }
        OracleType::UInt64 => {
            let val: Option<u64> = collection.get(idx)?;
            json!(val)
        }
        OracleType::Object(object_type) => {
            if object_type.is_collection() {
                match collection.get::<Option<Collection>>(idx)? {
                    Some(inner_collection) => {
                        let mut arr = Vec::with_capacity(inner_collection.size()? as usize);
                        let mut idx = inner_collection.first_index()?;
                        loop {
                            arr.push(get_collection_value(
                                &inner_collection,
                                idx,
                                inner_collection
                                    .object_type()
                                    .element_oracle_type()
                                    .unwrap(),
                            )?);
                            match inner_collection.next_index(idx) {
                                Ok(next_idx) => idx = next_idx,
                                Err(_) => {
                                    break;
                                }
                            }
                        }

                        json!(arr)
                    }
                    None => json!(Option::<Vec<Value>>::None),
                }
            } else {
                match collection.get::<Option<Object>>(idx)? {
                    Some(object) => {
                        let object_type = object.object_type();
                        let attributes = object_type.attributes();
                        let mut map = HashMap::with_capacity(attributes.len());

                        for attribute in attributes {
                            let key = attribute.name();
                            let val = get_object_value(&object, key, attribute.oracle_type())?;
                            map.insert(key, val);
                        }

                        json!(map)
                    }
                    None => json!(Option::<HashMap<String, Value>>::None),
                }
            }
        }
        _ => {
            let val: Option<String> = collection.get(idx)?;
            json!(val)
        }
    };

    Ok(json_val)
}

pub fn get_object_value(object: &Object, name: &str, sql_type: &OracleType) -> Result<Value> {
    let json_val = match sql_type {
        OracleType::Number(_, _) => {
            let val: Option<i64> = object.get(name)?;
            json!(val)
        }
        OracleType::Float(_) => {
            let val: Option<f64> = object.get(name)?;
            json!(val)
        }
        OracleType::Date => {
            let val: Option<NaiveDateTime> = object.get(name)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Timestamp(_) => {
            let val: Option<NaiveDateTime> = object.get(name)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampTZ(_) => {
            let val: Option<DateTime<Utc>> = object.get(name)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::TimestampLTZ(_) => {
            let val: Option<DateTime<Local>> = object.get(name)?;
            json!(val.map(|date_time| date_time.to_string()))
        }
        OracleType::Boolean => {
            let val: Option<bool> = object.get(name)?;
            json!(val)
        }
        OracleType::Int64 => {
            let val: Option<i64> = object.get(name)?;
            json!(val)
        }
        OracleType::UInt64 => {
            let val: Option<u64> = object.get(name)?;
            json!(val)
        }
        OracleType::Object(object_type) => {
            if object_type.is_collection() {
                match object.get::<Option<Collection>>(name)? {
                    Some(collection) => {
                        let mut arr = Vec::with_capacity(collection.size()? as usize);
                        let mut idx = collection.first_index()?;
                        loop {
                            arr.push(get_collection_value(
                                &collection,
                                idx,
                                collection.object_type().element_oracle_type().unwrap(),
                            )?);
                            match collection.next_index(idx) {
                                Ok(next_idx) => idx = next_idx,
                                Err(_) => {
                                    break;
                                }
                            }
                        }

                        json!(arr)
                    }
                    None => json!(Option::<Vec<Value>>::None),
                }
            } else {
                match object.get::<Option<Object>>(name)? {
                    Some(inner_object) => {
                        let object_type = inner_object.object_type();
                        let attributes = object_type.attributes();
                        let mut map = HashMap::with_capacity(attributes.len());

                        for attribute in attributes {
                            let key = attribute.name();
                            let val =
                                get_object_value(&inner_object, key, attribute.oracle_type())?;
                            map.insert(key, val);
                        }

                        json!(map)
                    }
                    None => json!(Option::<HashMap<String, Value>>::None),
                }
            }
        }
        _ => {
            let val: Option<String> = object.get(name)?;
            json!(val)
        }
    };

    Ok(json_val)
}
