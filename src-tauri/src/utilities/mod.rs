pub mod oracle;
pub mod postgres;
use std::net::SocketAddr;
use std::net::TcpListener;

pub fn find_position_line(statement: &str, pos: u32) -> u32 {
    let mut char_count = 0;
    for (i, line) in statement.split('\n').enumerate() {
        char_count += line.len() + 1;
        if char_count >= (pos as usize) {
            return (i + 1) as u32;
        }
    }

    return 0;
}

pub fn find_open_port() -> u16 {
    let addrs = [
        SocketAddr::from(([127, 0, 0, 1], 8888)),
        SocketAddr::from(([127, 0, 0, 1], 0)),
    ];

    let listener = TcpListener::bind(&addrs[..]).expect("Failed to bind random port");
    // We retrieve the port assigned to us by the OS
    listener.local_addr().unwrap().port()
}
