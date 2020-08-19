#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]
mod cmd;
mod handlers;
mod proxies;
mod core;

fn main() {
  match core::log::setup_logger() {
    Ok(()) => println!("logger setup successfully."),
    Err(e) => print!("logger setup failed: {}", e),
  }
  match proxies::postgres::get_proxy().validate_stmts(vec!["select * from greenco.account where id = any(array[$1])"]) {
    Ok(_) => println!("execute success."),
    Err(e) => println!("execute error: {}", e),
  }
  tauri::AppBuilder::new()
    .invoke_handler(cmd::dispatch_command)
    .build()
    .run();
}
