use std::collections::HashMap;

use async_graphql::*;
use log::info;

use crate::proxies::{
    app_state::{get_state, set_state, AppStateKey},
    java_props::{load_props, PropKey, PropVal, ValidationStatus},
    rocksdb::{get_conn, RocksDataStore},
    sql_common::{get_schema_stmt, SQLClient, SQLResult},
};

#[derive(Default, SimpleObject)]
pub struct JavaPropsResponse {
    class_list: Option<Vec<String>>,
    selected_class: Option<String>,
    selected_prop_key: Option<String>,
    prop_key_list: Option<Vec<PropKey>>,
    prop_vals: Option<PropVal>,
}

#[derive(Default)]
pub struct JavaPropsQuery;

#[derive(Default)]
pub struct JavaPropsMutation;

static JAVA_PROPS_CR: &str = "JAVA_PROPS_CR";

#[Object]
impl JavaPropsQuery {
    async fn current_java_props_state(&self) -> Result<JavaPropsResponse> {
        get_current_state()
    }
}

fn get_current_state() -> Result<JavaPropsResponse> {
    let app_state_keys = vec![
        AppStateKey::PropsMatchedClassList,
        AppStateKey::PropsSelectedClass,
        AppStateKey::PropsSelectedPropKey,
    ];
    let app_state_vals = get_state(app_state_keys)?;
    let class_list: Vec<String> = match &app_state_vals[0] {
        Some(class_list_str) => serde_json::from_str(class_list_str)?,
        None => Vec::new(),
    };
    let selected_class: String = match &app_state_vals[1] {
        Some(selected_class_str) => selected_class_str.to_string(),
        None => String::new(),
    };
    let selected_prop_key = match &app_state_vals[2] {
        Some(selected_prop_key_str) => selected_prop_key_str.to_string(),
        None => String::new(),
    };

    let db = get_conn();

    let prop_keys_save_key = format!("{}", selected_class);
    let prop_vals_save_key = format!("{}#{}", selected_class, selected_prop_key);

    let rst = RocksDataStore::multi_get(
        Some(JAVA_PROPS_CR),
        &[&prop_keys_save_key, &prop_vals_save_key],
        &db,
    )?;
    let prop_key_list: Vec<PropKey> = match &rst[0] {
        Some(prop_key_list_str) => serde_json::from_str(prop_key_list_str)?,
        None => Vec::new(),
    };
    let prop_vals: PropVal = match &rst[1] {
        Some(prop_vals_str) => serde_json::from_str(prop_vals_str)?,
        None => PropVal::new(),
    };

    Ok(JavaPropsResponse {
        class_list: Some(class_list),
        selected_class: Some(selected_class),
        selected_prop_key: Some(selected_prop_key),
        prop_key_list: Some(prop_key_list),
        prop_vals: Some(prop_vals),
        ..Default::default()
    })
}

#[Object]
impl JavaPropsMutation {
    async fn search_java_props(
        &self,
        filepath: String,
        class_pattern: String,
        validate_queries: bool,
    ) -> Result<JavaPropsResponse> {
        let mut file_props_map = load_props(&filepath, &class_pattern)?;
        if validate_queries {
            file_props_map = validate_sql_queries(&mut file_props_map).await?;
        }
        save_java_props(&file_props_map)?;
        load_java_porops_state(&file_props_map)
    }

    async fn select_class(&self, class_name: String) -> Result<JavaPropsResponse> {
        let prop_keys = select_class(&class_name)?;
        let prop_key = if !prop_keys.is_empty() {
            prop_keys[0].name.to_string()
        } else {
            String::new()
        };

        let prop_vals = select_prop_key(&class_name, &prop_key)?;

        Ok(JavaPropsResponse {
            prop_key_list: Some(prop_keys),
            prop_vals: Some(prop_vals),
            ..Default::default()
        })
    }

    async fn select_prop_key(
        &self,
        class_name: String,
        prop_key: String,
    ) -> Result<JavaPropsResponse> {
        let prop_vals = select_prop_key(&class_name, &prop_key)?;

        Ok(JavaPropsResponse {
            prop_vals: Some(prop_vals),
            ..Default::default()
        })
    }

    async fn prop_vals(
        &self,
        class_name: String,
        prop_key: String,
        prop_vals: Vec<Option<String>>,
    ) -> Result<bool> {
        save_prop_vals(&class_name, &prop_key, prop_vals)
    }
}

fn save_prop_vals(
    class_name: &str,
    prop_key: &str,
    prop_vals: Vec<Option<String>>,
) -> Result<bool> {
    if prop_vals.len() != 2 {
        return Err(Error::new("The size of prop vals should be 2."));
    }

    let mut db = get_conn();
    let save_key = format!("{}#{}", class_name, prop_key);
    let save_val = serde_json::to_string(&prop_vals)?;
    RocksDataStore::write_batch(JAVA_PROPS_CR, &[(&save_key, &save_val)], &mut db)
        .map(|_| true)
        .map_err(|e| e.into())
}

fn select_prop_key(class_name: &str, prop_key: &str) -> Result<PropVal> {
    let state_keys = vec![AppStateKey::PropsSelectedPropKey];
    let state_vals = vec![prop_key.to_string()];
    set_state(state_keys, state_vals)?;

    let prop_val_save_key = format!("{}#{}", class_name, prop_key);
    let db = &get_conn();
    let get_res = RocksDataStore::multi_get(Some(JAVA_PROPS_CR), &[&prop_val_save_key], db)?;
    let prop_val: PropVal = match &get_res[0] {
        Some(r) => serde_json::from_str(r)?,
        None => PropVal::new(),
    };

    Ok(prop_val)
}

fn select_class(class_name: &str) -> Result<Vec<PropKey>> {
    let state_keys = vec![AppStateKey::PropsSelectedClass];
    let state_vals = vec![class_name.to_string()];
    set_state(state_keys, state_vals)?;

    let prop_keys_save_key = class_name.to_string();
    let db = get_conn();
    let get_res = RocksDataStore::multi_get(Some(JAVA_PROPS_CR), &[&prop_keys_save_key], &db)?;
    let prop_val: Vec<PropKey> = match &get_res[0] {
        Some(r) => serde_json::from_str(r)?,
        None => Vec::new(),
    };

    Ok(prop_val)
}

fn save_java_props(file_props_map: &HashMap<String, HashMap<PropKey, PropVal>>) -> Result<()> {
    let mut key_vals = Vec::with_capacity(file_props_map.len());
    for (class_name, prop_key_vals_map) in file_props_map {
        let save_key = class_name.to_string();
        let mut prop_key_list_ref = prop_key_vals_map.keys().collect::<Vec<&PropKey>>();
        prop_key_list_ref.sort_by_key(|pk| &pk.name);
        let save_val = serde_json::to_string(&prop_key_list_ref)?;
        key_vals.push((save_key, save_val));

        for (prop_key, prop_key_vals) in prop_key_vals_map {
            let save_key = format!("{}#{}", &class_name, &prop_key.name);
            let save_val = serde_json::to_string(&prop_key_vals)?;
            key_vals.push((save_key, save_val));
        }
    }
    let mut db = get_conn();
    let mut key_vals_ref: Vec<(&str, &str)> = Vec::with_capacity(key_vals.len());
    for i in 0..key_vals.len() {
        key_vals_ref.push((&key_vals[i].0, &key_vals[i].1));
    }

    match db.drop_cf(JAVA_PROPS_CR) {
        Ok(_) => info!("Dropped the CF for Java Props"),
        Err(e) => info!("Failed to drop the CF for Java Props {}", e),
    }

    RocksDataStore::write_batch(JAVA_PROPS_CR, &key_vals_ref, &mut db).map_err(|e| e.into())
}

fn load_java_porops_state(
    file_props_map: &HashMap<String, HashMap<PropKey, PropVal>>,
) -> Result<JavaPropsResponse> {
    let mut class_list: Vec<String> = file_props_map.keys().map(|k| k.to_string()).collect();
    class_list.sort();
    let selected_class = if class_list.len() > 0 {
        class_list[0].clone()
    } else {
        String::new()
    };

    let mut prop_keys: Vec<PropKey> = match file_props_map.get(&selected_class) {
        Some(val) => val.keys().map(|k| k.clone()).collect(),
        None => Vec::new(),
    };
    prop_keys.sort_by_key(|pk| pk.name.to_string());
    let (selected_prop_key_opt, selected_prop_key) = if prop_keys.len() > 0 {
        (Some(&prop_keys[0]), prop_keys[0].name.to_string())
    } else {
        (None, String::new())
    };

    let selected_prop_vals = if let Some(selected_prop_key) = selected_prop_key_opt {
        match file_props_map
            .get(&selected_class)
            .and_then(|key_val_map| key_val_map.get(&selected_prop_key))
        {
            Some(vals) => vals.clone(),
            None => PropVal::new(),
        }
    } else {
        PropVal::new()
    };

    let state_keys = vec![
        AppStateKey::PropsMatchedClassList,
        AppStateKey::PropsSelectedClass,
        AppStateKey::PropsSelectedPropKey,
    ];

    let state_vals = vec![
        serde_json::to_string(&class_list)?,
        selected_class.clone(),
        selected_prop_key_opt
            .map(|spk| spk.name.to_string())
            .unwrap_or_default(),
    ];

    set_state(state_keys, state_vals)?;

    Ok(JavaPropsResponse {
        class_list: Some(class_list),
        prop_key_list: Some(prop_keys),
        prop_vals: Some(selected_prop_vals),
        selected_class: Some(selected_class),
        selected_prop_key: Some(selected_prop_key),
        ..Default::default()
    })
}

async fn validate_sql_queries(
    file_props_map: &mut HashMap<String, HashMap<PropKey, PropVal>>,
) -> Result<HashMap<String, HashMap<PropKey, PropVal>>> {
    let ora_proxy: &dyn SQLClient = crate::proxies::oracle::get_proxy();
    let pg_proxy: &dyn SQLClient = crate::proxies::postgres::get_proxy();
    let mut new_file_props_map = HashMap::new();

    for (java_class, mut prop_key_val_map) in file_props_map.drain() {
        let mut ora_queries = Vec::with_capacity(prop_key_val_map.len());
        let mut pg_queries = Vec::with_capacity(prop_key_val_map.len());
        let mut validate_results = Vec::with_capacity(prop_key_val_map.len());
        for prop_val in prop_key_val_map.values_mut() {
            let ora_query = &prop_val.value_pair[0];
            let pg_query = &prop_val.value_pair[1];
            validate_results.push(&mut prop_val.validation_error);

            if !ora_query.is_empty() {
                ora_queries.push(get_schema_stmt("GREENCO", ora_query));
            } else {
                ora_queries.push(String::new());
            }
            if !pg_query.is_empty() {
                pg_queries.push(get_schema_stmt("GREENCO", pg_query));
            } else if !ora_query.is_empty() {
                pg_queries.push(get_schema_stmt("GREENCO", ora_query));
            } else {
                pg_queries.push(String::new());
            }
        }

        let ora_query_refs: Vec<&str> = ora_queries
            .iter()
            .map(|ora_query| ora_query.as_ref())
            .collect();
        let pg_query_refs: Vec<&str> = pg_queries
            .iter()
            .map(|ora_query| ora_query.as_ref())
            .collect();
        let mut ora_rsts = ora_proxy.validate_stmts(&ora_query_refs)?;
        let mut pg_rsts = pg_proxy.validate_stmts(&pg_query_refs)?;
        for i in 0..ora_queries.len() {
            let vr = validate_results.pop().unwrap();
            let or = if !ora_queries[i].is_empty() {
                match ora_rsts.pop().unwrap() {
                    SQLResult::Error(e) => Some(e),
                    _ => None,
                }
            } else {
                None
            };
            let pr = if !pg_queries[i].is_empty() {
                match pg_rsts.pop().unwrap() {
                    SQLResult::Error(e) => Some(e),
                    _ => None,
                }
            } else {
                None
            };

            vr.push(Json::from(or));
            vr.push(Json::from(pr));
        }
        let mut new_prop_key_val_map = HashMap::new();
        for (mut prop_key, prop_val) in prop_key_val_map.drain() {
            let vs = if prop_val.validation_error[0].is_some()
                || prop_val.validation_error[1].is_some()
            {
                ValidationStatus::Error
            } else {
                ValidationStatus::Pass
            };
            prop_key.validation_status = Some(vs);
            new_prop_key_val_map.insert(prop_key, prop_val);
        }
        new_file_props_map.insert(java_class, new_prop_key_val_map);
    }
    Ok(new_file_props_map)
}
