#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::thread;

use mylib::graphql::run_graphql_server;
use mylib::utilities::find_open_port;
use tauri::Submenu;
use tauri::{Menu, MenuItem};

use mylib::state::AppState;

static APP_NAME: &str = "AP Database Dev Tool";

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
