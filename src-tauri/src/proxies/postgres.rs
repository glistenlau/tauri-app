use anyhow::{anyhow, Result};
use serde_json::Value;
use std::time::Instant;
use tokio::{pin, spawn, stream::StreamExt};
use tokio_postgres::{
    types::{ToSql, Type},
    Client, Config, Connection, Error, NoTls, Row,
};

use super::sql_common::{SQLClient, SQLError, SQLReponse, SQLResult, SQLResultSet};

#[derive(Copy, Clone)]
pub struct ConnectionConfig<'a> {
    host: &'a str,
    port: &'a str,
    user: &'a str,
    password: &'a str,
    dbname: &'a str,
}

impl ConnectionConfig<'_> {
    fn to_key_value_string(&self) -> String {
        format!(
            "host={} port={} user={} password={} dbname={}",
            self.host, self.port, self.user, self.password, self.dbname
        )
    }
}

pub struct PostgresProxy<'a> {
    config: ConnectionConfig<'a>,
    client: Option<Client>,
}

impl PostgresProxy<'_> {
    const fn new(config: ConnectionConfig) -> PostgresProxy {
        PostgresProxy {
            config: config,
            client: None,
        }
    }

    async fn connect(&self) -> Result<Client, Error> {
        let (client, connection) =
            tokio_postgres::connect(&self.config.to_key_value_string(), NoTls).await?;

        spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("postgres connection error: {}", e);
            }
        });

        Ok(client)
    }

    async fn execute_statement(&self, stmt: &str) -> Result<SQLResultSet, Error> {
        let client = self.connect().await?;

        let rsp = client.simple_query(stmt).await?;
        let mut row_count = 0;

        let mut res_columns: Vec<String> = Vec::new();
        let mut res_rows: Vec<Vec<String>> = Vec::new();

        for sqm in rsp {
            match sqm {
                tokio_postgres::SimpleQueryMessage::Row(row) => {
                    let mut res_row = Vec::with_capacity(row.len());
                    for i in 0..row.len() {
                        res_row.push(String::from(row.try_get(i)?.unwrap_or_default()));
                    }
                    res_rows.push(res_row);
                }
                tokio_postgres::SimpleQueryMessage::CommandComplete(count) => {
                    row_count = count as usize;
                }
                tokio_postgres::SimpleQueryMessage::Columns(columns) => {
                    res_columns = columns;
                }
                _ => {}
            }
        }

        Ok(SQLResultSet::new(
            row_count,
            Some(res_columns),
            Some(res_rows),
        ))
    }

    fn map_params(&self, params: &[Value]) -> Result<Vec<String>> {
        let mut mapped_params = Vec::with_capacity(params.len());
        for param in params {
            mapped_params.push(self.map_param(param)?);
        }

        Ok(mapped_params)
    }

    fn map_param(&self, param: &Value) -> Result<String> {
        let mapped_param = match param {
            Value::Null => String::from("null"),
            Value::Bool(val) => val.to_string(),
            Value::Number(val) => {
                if val.is_f64() {
                    val.as_f64().unwrap().to_string()
                } else {
                    val.as_i64().unwrap().to_string()
                }
            }
            Value::String(val) => format!("'{}'", val),
            Value::Array(arr) => {
                let mut mapped_arr = Vec::with_capacity(arr.len());
                for val in arr {
                    mapped_arr.push(self.map_param(val)?);
                }

                mapped_arr.join(",")
            }
            Value::Object(_) => return Err(anyhow!("not support object param for postgres.")),
        };

        Ok(mapped_param)
    }
}

impl<'a> SQLClient for PostgresProxy<'_> {
    #[tokio::main]
    async fn execute<'b>(&self, statement: &str, parameters: &[Value]) -> SQLReponse {
        let now = Instant::now();
        let stmt;
        if parameters.len() > 0 {
            let mut filled_stmt = String::with_capacity(statement.len());
            let mut stmt_iter = statement.split("?");
            let mapped_params = match self.map_params(parameters) {
                Ok(mapped_params) => mapped_params,
                Err(e) => return SQLReponse::from(
                    false,
                    now.elapsed(),
                    SQLResult::Error(SQLError::from(e.to_string())),
                ),
            };
            let mut params_iter = mapped_params.iter();

            filled_stmt.push_str(stmt_iter.next().unwrap_or_default());

            while let (Some(part), Some(param)) = (stmt_iter.next(), params_iter.next()) {
                filled_stmt.push_str(param);
                filled_stmt.push_str(part);
            }
            if (stmt_iter.next(), params_iter.next()) != (None, None) {
                return SQLReponse::from(
                    false,
                    now.elapsed(),
                    SQLResult::Error(SQLError::from(String::from(
                        "paramters are not matched with the statement.",
                    ))),
                );
            }
            stmt = String::from(filled_stmt);
        } else {
            stmt = String::from(statement);
        }

        match self.execute_statement(&stmt).await {
            Ok(rs) => SQLReponse::from(true, now.elapsed(), SQLResult::Result(rs)),
            Err(e) => {
                println!("postgres error: {}", e);
                SQLReponse::from(
                    false,
                    now.elapsed(),
                    SQLResult::Error(SQLError::from(e.to_string())),
                )
            }
        }
    }
}

static DEFAULT_CONFIG: ConnectionConfig = ConnectionConfig {
    host: "localhost",
    port: "5432",
    user: "postgres",
    password: "#postgres#",
    dbname: "planning",
};

static INSTANCE: PostgresProxy = PostgresProxy {
    config: DEFAULT_CONFIG,
    client: None,
};

pub fn get_proxy() -> &'static PostgresProxy<'static> {
    &INSTANCE
}
