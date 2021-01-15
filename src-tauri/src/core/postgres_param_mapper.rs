use std::convert::TryFrom;

use anyhow::{anyhow, Error, Result};
use chrono::{DateTime, NaiveDateTime};
use chrono::{FixedOffset, NaiveDate, NaiveTime, Utc};
use log::debug;
use serde_json::Value;
use tokio_postgres::types::{ToSql, Type};
use uuid::Uuid;

fn generate_error(param: &Value, sql_type: &Type) -> Error {
    anyhow!(
        "param conversion error: expect {}, got {}.",
        sql_type,
        param
    )
}

fn map_to_sql_int2(param: &Value) -> Result<Option<i16>> {
    let mut is_valid = true;
    let val: Option<i16> = match param {
        Value::Null => Option::<i16>::None,
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().unwrap() as i16)
            } else {
                Some(i16::try_from(num.as_i64().unwrap())?)
            }
        }
        Value::String(str) => {
            let parsed_int: i16 = str.parse()?;
            Some(parsed_int)
        }
        _ => {
            is_valid = false;
            Option::<i16>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::INT2));
    }

    Ok(val)
}

fn map_to_sql_int4(param: &Value) -> Result<Option<i32>> {
    let mut is_valid = true;
    let val: Option<i32> = match param {
        Value::Null => Option::<i32>::None,
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().unwrap() as i32)
            } else {
                Some(i32::try_from(num.as_i64().unwrap())?)
            }
        }
        Value::String(str) => {
            let parsed_int: i32 = str.parse()?;
            Some(parsed_int)
        }
        _ => {
            is_valid = false;
            Option::<i32>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::INT4));
    }

    Ok(val)
}

fn map_to_sql_int8(param: &Value) -> Result<Option<i64>> {
    let mut is_valid = true;
    let val: Option<i64> = match param {
        Value::Null => Option::<i64>::None,
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().unwrap() as i64)
            } else {
                Some(i64::try_from(num.as_i64().unwrap())?)
            }
        }
        Value::String(str) => {
            let parsed_int: i64 = str.parse()?;
            Some(parsed_int)
        }
        _ => {
            is_valid = false;
            Option::<i64>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::INT8));
    }

    Ok(val)
}

fn map_to_sql_float4(param: &Value) -> Result<Option<f32>> {
    let mut is_valid = true;
    let val: Option<f32> = match param {
        Value::Null => Option::<f32>::None,
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().unwrap() as f32)
            } else {
                Some(num.as_i64().unwrap() as f32)
            }
        }
        Value::String(str) => {
            let parsed_int: f32 = str.parse()?;
            Some(parsed_int)
        }
        _ => {
            is_valid = false;
            Option::<f32>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::FLOAT4));
    }

    Ok(val)
}

fn map_to_sql_float8(param: &Value) -> Result<Option<f64>> {
    let mut is_valid = true;
    let val: Option<f64> = match param {
        Value::Null => Option::<f64>::None,
        Value::Number(num) => {
            if num.is_f64() {
                Some(num.as_f64().unwrap())
            } else {
                Some(num.as_i64().unwrap() as f64)
            }
        }
        Value::String(str) => {
            let parsed_int: f64 = str.parse()?;
            Some(parsed_int)
        }
        _ => {
            is_valid = false;
            Option::<f64>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::FLOAT4));
    }

    Ok(val)
}

fn map_to_sql_bool(param: &Value) -> Result<Option<bool>> {
    let mut is_valid = true;

    let val: Option<bool> = match param {
        Value::Null => Option::<bool>::None,
        Value::Number(num) => {
            if num.is_f64() {
                is_valid = false;
                Option::<bool>::None
            } else {
                if num.as_i64().unwrap() <= 0 {
                    Some(false)
                } else {
                    Some(true)
                }
            }
        }
        Value::Bool(bool) => Some(*bool),
        _ => {
            is_valid = false;
            Option::<bool>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::BOOL));
    }

    Ok(val)
}

fn map_to_sql_timestamp(param: &Value) -> Result<Option<NaiveDateTime>> {
    let val = match param {
        Value::Null => Option::<NaiveDateTime>::None,
        Value::String(str_val) => Some(str_val.parse::<NaiveDateTime>()?),
        _ => return Err(generate_error(param, &Type::TIMESTAMP)),
    };

    Ok(val)
}

fn map_to_sql_timestamptz(param: &Value) -> Result<Option<DateTime<Utc>>> {
    let val = match param {
        Value::Null => Option::<DateTime<Utc>>::None,
        Value::String(str_val) => Some(str_val.parse::<DateTime<Utc>>()?),
        _ => return Err(generate_error(param, &Type::TIMESTAMPTZ)),
    };

    Ok(val)
}

fn map_to_sql_date(param: &Value) -> Result<Option<NaiveDate>> {
    let val = match param {
        Value::Null => Option::<NaiveDate>::None,
        Value::String(str_val) => Some(str_val.parse::<NaiveDate>()?),
        _ => return Err(generate_error(param, &Type::DATE)),
    };

    Ok(val)
}

fn map_to_sql_time(param: &Value) -> Result<Option<NaiveTime>> {
    let val = match param {
        Value::Null => Option::<NaiveTime>::None,
        Value::String(str_val) => Some(str_val.parse::<NaiveTime>()?),
        _ => return Err(generate_error(param, &Type::TIME)),
    };

    Ok(val)
}

fn map_to_sql_uuid(param: &Value) -> Result<Option<Uuid>> {
    let mut is_valid = true;

    let val = match param {
        Value::Null => Option::<Uuid>::None,
        Value::String(uuid_str) => match Uuid::parse_str(uuid_str) {
            Ok(uuid_val) => Some(uuid_val),
            Err(e) => {
                debug!("convert uuid error: {}", e);
                is_valid = false;
                Option::<Uuid>::None
            }
        },
        _ => {
            is_valid = false;
            Option::<Uuid>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, &Type::UUID));
    }

    Ok(val)
}

fn map_to_sql_text(param: &Value, sql_type: &Type) -> Result<Option<String>> {
    let mut is_valid = true;

    let val: Option<String> = match param {
        Value::Null => Option::<String>::None,
        Value::String(str) => Some(String::from(str)),
        _ => {
            is_valid = false;
            Option::<String>::None
        }
    };

    if !is_valid {
        return Err(generate_error(param, sql_type));
    }

    Ok(val)
}

pub fn map_to_sql(param: &Value, sql_type: &Type) -> Result<Box<dyn ToSql + Sync>> {
    let mapped_param: Box<dyn ToSql + Sync>;
    match sql_type.kind() {
        tokio_postgres::types::Kind::Simple => {
            if *sql_type == Type::BOOL {
                mapped_param = Box::new(map_to_sql_bool(param)?);
            } else if *sql_type == Type::INT2 {
                mapped_param = Box::new(map_to_sql_int2(param)?);
            } else if *sql_type == Type::INT4 {
                mapped_param = Box::new(map_to_sql_int4(param)?);
            } else if *sql_type == Type::INT8 {
                mapped_param = Box::new(map_to_sql_int8(param)?);
            } else if *sql_type == Type::FLOAT4 {
                mapped_param = Box::new(map_to_sql_float4(param)?);
            } else if *sql_type == Type::FLOAT8 {
                mapped_param = Box::new(map_to_sql_float8(param)?);
            } else if *sql_type == Type::UUID {
                mapped_param = Box::new(map_to_sql_uuid(param)?);
            } else if *sql_type == Type::TIMESTAMP {
                mapped_param = Box::new(map_to_sql_timestamp(param)?);
            } else if *sql_type == Type::TIMESTAMPTZ {
                mapped_param = Box::new(map_to_sql_timestamptz(param)?);
            } else if *sql_type == Type::DATE {
                mapped_param = Box::new(map_to_sql_date(param)?);
            } else if *sql_type == Type::TIME {
                mapped_param = Box::new(map_to_sql_time(param)?);
            } else {
                mapped_param = Box::new(map_to_sql_text(param, sql_type)?);
            }
        }
        tokio_postgres::types::Kind::Array(element_type) => {
            if *element_type == Type::BOOL {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<bool>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_bool(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::INT2 {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<i16>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_int2(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::INT4 {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<i32>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_int4(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::INT8 {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<i64>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_int8(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::FLOAT4 {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<f32>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_float4(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::FLOAT8 {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<f64>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_float8(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::TIMESTAMP {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<NaiveDateTime>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_timestamp(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::TIMESTAMPTZ {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<DateTime<FixedOffset>>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_timestamptz(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::DATE {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<NaiveDate>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_date(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::TIME {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<NaiveTime>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_time(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else if *element_type == Type::UUID {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<Uuid>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_uuid(val)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            } else {
                match param {
                    Value::Null => {
                        mapped_param = Box::new(Option::<Vec<String>>::None);
                    }
                    Value::Array(arr) => {
                        let mut mapped_arr = Vec::with_capacity(arr.len());
                        for val in arr {
                            mapped_arr.push(map_to_sql_text(val, element_type)?);
                        }
                        mapped_param = Box::new(mapped_arr);
                    }
                    _ => {
                        return Err(generate_error(param, sql_type));
                    }
                }
            }
        }
        _ => {
            return Err(generate_error(param, sql_type));
        }
    }

    Ok(mapped_param)
}
