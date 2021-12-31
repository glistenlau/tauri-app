use crate::proxies::{
    app_state::{delete_state, get_state, set_state, AppStateKey},
    rocksdb::{self, RocksDataStore},
};
use async_graphql::*;

#[derive(Default)]
pub struct AppStateQuery;

#[Object]
impl AppStateQuery {
    async fn app_state(
        &self,
        _ctx: &Context<'_>,
        state_keys: Vec<AppStateKey>,
    ) -> Result<Vec<Option<String>>> {
        get_state(state_keys).map_err(|e| e.into())
    }
}

#[derive(Default)]
pub struct AppStateMutation;

#[Object]
impl AppStateMutation {
    async fn app_state(
        &self,
        _ctx: &Context<'_>,
        state_keys: Vec<AppStateKey>,
        state_vals: Vec<String>,
    ) -> Result<bool> {
        set_state(state_keys, state_vals).map_err(|e| e.into())
    }

    async fn delete_app_state(
        &self,
        _ctx: &Context<'_>,
        state_keys: Vec<AppStateKey>,
    ) -> Result<bool> {
        delete_state(state_keys).map(|_| true).map_err(|e| e.into())
    }
}
