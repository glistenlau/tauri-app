#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Menu, MenuItem};

mod core;
mod entity;
mod graphql;
mod handlers;
mod proxies;
mod utilities;

fn main() {
    match core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }

    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let close = CustomMenuItem::new("close".to_string(), "Close");
    let menu = vec![
        // on macOS first menu is always app name
        Menu::new(
            "AP Database Dev Tool",
            vec![
                MenuItem::Services,
                MenuItem::Separator,
                MenuItem::Hide,
                MenuItem::HideOthers,
                MenuItem::ShowAll,
                MenuItem::Separator,
                MenuItem::Custom(quit),
                MenuItem::Custom(close),
            ],
        ),
        Menu::new(
            "Edit",
            vec![
                MenuItem::Undo,
                MenuItem::Redo,
                MenuItem::Separator,
                MenuItem::Cut,
                MenuItem::Copy,
                MenuItem::Paste,
                MenuItem::Separator,
                MenuItem::SelectAll,
            ],
        ),
    ];

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id().as_str() {
            "quit" => {
                std::process::exit(0);
            }
            "close" => {
                event.window().close().unwrap();
            }
            _ => {}
        })
        // This is where you pass in your commands
        .invoke_handler(tauri::generate_handler![handlers::invoke_handler])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
