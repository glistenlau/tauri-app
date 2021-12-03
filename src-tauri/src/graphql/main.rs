use mylib::{graphql::run_graphql_server, utilities::find_open_port};

fn main() {
    let port = find_open_port();
    match mylib::core::log::setup_logger() {
        Ok(()) => log::info!("logger setup successfully."),
        Err(e) => log::error!("logger setup failed: {}", e),
    }
    run_graphql_server(port)
}
