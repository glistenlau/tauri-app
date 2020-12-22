pub mod oracle;
pub mod postgres;

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
