#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{net::TcpListener, thread};

use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use async_graphql_warp::{BadRequest, Response};
use mylib::graphql::Query;
use tauri::Submenu;
use tauri::{api::process::Command, CustomMenuItem, Menu, MenuItem};
use tokio::runtime::Runtime;
mod core;
mod entity;
mod graphql;
mod handlers;
mod proxies;
mod utilities;
mod state;
use std::convert::Infallible;
use std::{env, pin::Pin, sync::Arc, time::Duration};
use warp::{http::Response as HttpResponse, Filter, Rejection};

use futures::{FutureExt as _, Stream};

use crate::state::AppState;

static app_name: &str = "AP Database Dev Tool";

fn find_random_open_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind random port");
    // We retrieve the port assigned to us by the OS
    listener.local_addr().unwrap().port()
}

fn get_menu() -> Menu {
    Menu::new()
        .add_submenu(Submenu::new(
            app_name,
            Menu::new()
                .add_native_item(MenuItem::About(app_name.to_string()))
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Services)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Hide)
                .add_native_item(MenuItem::HideOthers)
                .add_native_item(MenuItem::ShowAll)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Quit),
        ))
        .add_submenu(Submenu::new(
            "File",
            if cfg!(macos) {
                Menu::new().add_native_item(MenuItem::CloseWindow)
            } else {
                Menu::new().add_native_item(MenuItem::Quit)
            },
        ))
        .add_submenu(Submenu::new(
            "Edit",
            Menu::new()
                .add_native_item(MenuItem::Undo)
                .add_native_item(MenuItem::Redo)
                .add_native_item(MenuItem::Separator)
                .add_native_item(MenuItem::Cut)
                .add_native_item(MenuItem::Copy)
                .add_native_item(MenuItem::Paste)
                .add_native_item(MenuItem::SelectAll),
        ))
        .add_submenu(Submenu::new(
            "View",
            Menu::new().add_native_item(MenuItem::EnterFullScreen),
        ))
        .add_submenu(Submenu::new("Window", 
            Menu::new()
                .add_native_item(MenuItem::Minimize)
                .add_native_item(MenuItem::Zoom)
                .add_native_item(MenuItem::CloseWindow
        )))
}

fn main() {
    match core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }

    let port = find_random_open_port();

    tauri::Builder::default()
        .menu(get_menu())
        .setup(move |app| {
            thread::spawn(move || {
                let web_runtime = Runtime::new().unwrap();
                web_runtime.block_on(async {
                    let schema = Schema::build(Query, EmptyMutation, EmptySubscription).finish();

                    let graphql_post = warp::path("graphql")
                        .and(async_graphql_warp::graphql(schema.clone()))
                        .and_then(
                            |(schema, request): (
                                Schema<Query, EmptyMutation, EmptySubscription>,
                                async_graphql::Request,
                            )| async move {
                                Ok::<_, Infallible>(Response::from(schema.execute(request).await))
                            },
                        );

                    let graphql_playground = warp::path("playground").and(warp::get()).map(|| {
                        HttpResponse::builder()
                            .header("content-type", "text/html")
                            .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
                    });

                    let routes = graphql_playground.or(graphql_post);

                    warp::serve(routes).run(([127, 0, 0, 1], port)).await;
                });
            });
            Ok(())
        })
        .manage(AppState {server_port: port})
        // This is where you pass in your commands
        .invoke_handler(tauri::generate_handler![handlers::invoke_handler])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
