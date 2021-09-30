#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::net::SocketAddr;
use std::{net::TcpListener, thread};

use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::{EmptyMutation, Schema};
use async_graphql_warp::{graphql_subscription, Response};
use mylib::graphql::Query;
use tauri::Submenu;
use tauri::{Menu, MenuItem};

use std::convert::Infallible;

use warp::{http::Response as HttpResponse, Filter};

use mylib::graphql::Subscription;
use mylib::state::AppState;

static APP_NAME: &str = "AP Database Dev Tool";

fn find_open_port() -> u16 {
    let addrs = [
        SocketAddr::from(([127, 0, 0, 1], 8888)),
        SocketAddr::from(([127, 0, 0, 1], 0)),
    ];

    let listener = TcpListener::bind(&addrs[..]).expect("Failed to bind random port");
    // We retrieve the port assigned to us by the OS
    listener.local_addr().unwrap().port()
}

fn get_menu() -> Menu {
    Menu::new()
        .add_submenu(Submenu::new(
            APP_NAME,
            Menu::new()
                .add_native_item(MenuItem::About(APP_NAME.to_string()))
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
        .add_submenu(Submenu::new(
            "Window",
            Menu::new()
                .add_native_item(MenuItem::Minimize)
                .add_native_item(MenuItem::Zoom)
                .add_native_item(MenuItem::CloseWindow),
        ))
}

#[tokio::main]
async fn run_graphql_server(port: u16) {
    let schema = Schema::build(Query::default(), EmptyMutation, Subscription).finish();

    let graphql_post =
        warp::path("graphql").and(async_graphql_warp::graphql(schema.clone()).and_then(
            |(schema, request): (
                Schema<Query, EmptyMutation, Subscription>,
                async_graphql::Request,
            )| async move {
                let rsp = Response::from(schema.execute(request).await);
                Ok::<_, Infallible>(rsp)
            },
        ));

    let graphql_playground = warp::path::end().and(warp::get()).map(|| {
        HttpResponse::builder()
            .header("content-type", "text/html")
            .body(playground_source(
                GraphQLPlaygroundConfig::new("/graphql").subscription_endpoint("/"),
            ))
    });

    let routes = graphql_subscription(schema)
        .or(graphql_playground)
        .or(graphql_post.with(
            warp::cors()
                .allow_any_origin()
                .allow_header("Content-Type")
                .allow_method("POST"),
        ));

    warp::serve(routes).run(([127, 0, 0, 1], port)).await;
}

fn main() {
    match mylib::core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }

    let port = find_open_port();

    tauri::Builder::default()
        .menu(get_menu())
        .setup(move |_app| {
            thread::spawn(move || run_graphql_server(port));
            Ok(())
        })
        .manage(AppState { server_port: port })
        // This is where you pass in your commands
        .invoke_handler(tauri::generate_handler![mylib::handlers::invoke_handler])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
