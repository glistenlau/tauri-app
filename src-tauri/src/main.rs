#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{net::TcpListener, thread};

use async_graphql::http::{GraphQLPlaygroundConfig, playground_source};
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use async_graphql_warp::{BadRequest, Response};
use mylib::graphql::Query;
use tauri::{api::process::Command, CustomMenuItem, Menu, MenuItem};
use tokio::runtime::Runtime;
mod core;
mod entity;
mod graphql;
mod handlers;
mod proxies;
mod utilities;
use std::{env, pin::Pin, sync::Arc, time::Duration};
use std::convert::Infallible;
use warp::{http::Response as HttpResponse, Filter, Rejection};

use futures::{FutureExt as _, Stream};

fn find_random_open_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind random port");
    // We retrieve the port assigned to us by the OS
    listener.local_addr().unwrap().port()
}

fn main() {
    match core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }

    let port = 8888;

    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let close = CustomMenuItem::new("close".to_string(), "Close");
    // let menu = vec![
    //     // on macOS first menu is always app name
    //     Menu::new(
    //         "AP Database Dev Tool",
    //         vec![
    //             MenuItem::Services,
    //             MenuItem::Separator,
    //             MenuItem::Hide,
    //             MenuItem::HideOthers,
    //             MenuItem::ShowAll,
    //             MenuItem::Separator,
    //             MenuItem::Custom(quit),
    //             MenuItem::Custom(close),
    //         ],
    //     ),
    //     Menu::new(
    //         "Edit",
    //         vec![
    //             MenuItem::Undo,
    //             MenuItem::Redo,
    //             MenuItem::Separator,
    //             MenuItem::Cut,
    //             MenuItem::Copy,
    //             MenuItem::Paste,
    //             MenuItem::Separator,
    //             MenuItem::SelectAll,
    //         ],
    //     ),
    // ];

    tauri::Builder::default()
        // .menu(menu)
        // .on_menu_event(|event| match event.menu_item_id().as_str() {
        //     "quit" => {
        //         std::process::exit(0);
        //     }
        //     "close" => {
        //         event.window().close().unwrap();
        //     }
        //     _ => {}
        // })
        .setup(move |app| {
            thread::spawn(move ||{
                let web_runtime = Runtime::new().unwrap();
                web_runtime.block_on(async {
                    let schema = Schema::build(Query, EmptyMutation, EmptySubscription).finish();

                    let graphql_post = warp::path("graphql").and(async_graphql_warp::graphql(schema.clone())).and_then(
                        |(schema, request): (
                            Schema<Query, EmptyMutation, EmptySubscription>,
                            async_graphql::Request,
                        )| async move { Ok::<_, Infallible>(Response::from(schema.execute(request).await)) },
                    );

                    let graphql_playground = warp::path("playground").and(warp::get()).map(|| {
                        HttpResponse::builder()
                            .header("content-type", "text/html")
                            .body(playground_source(
                                GraphQLPlaygroundConfig::new("/graphql"),
                            ))
                    });
    
                    let routes = graphql_playground
                    .or(graphql_post);
     
                    warp::serve(routes).run(([127, 0, 0, 1], port)).await;
                });
            });
            Ok(())
        })
        // This is where you pass in your commands
        .invoke_handler(tauri::generate_handler![handlers::invoke_handler])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
