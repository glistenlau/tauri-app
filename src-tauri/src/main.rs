#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]
mod cmd;
mod handlers;
mod proxies;

fn main() {
  tauri::AppBuilder::new()
    .invoke_handler(cmd::dispatch_command)
    .build()
    .run();
}
