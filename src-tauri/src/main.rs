#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

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

    tauri::Builder::default()
        // This is where you pass in your commands
        .invoke_handler(tauri::generate_handler![handlers::invoke_handler])
        .run(tauri::generate_context!())
        .expect("failed to run app");
}
