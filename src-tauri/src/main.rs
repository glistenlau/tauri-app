#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]


mod cmd;
mod core;
mod graphql;
mod event;
mod handlers;
mod proxies;
mod utilities;

fn main() {
    match core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }

    print!("dirs: {:?}", dirs::data_dir());

    tauri::AppBuilder::new()
        .setup(|_webview, _source| {
            let webview_mut = _webview.as_mut();
            event::get_emitter()
                .lock()
                .unwrap()
                .set_webview(webview_mut);
        })
        .invoke_handler(cmd::dispatch_command)
        .build()
        .run();
}
