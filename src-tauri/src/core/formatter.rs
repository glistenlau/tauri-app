use sqlformat::FormatOptions;

// pub fn format_sql(stmt: &str) -> String {
//     let formated = sqlformat::format(
//         stmt,
//         &sqlformat::QueryParams::None,
//         FormatOptions::default(),
//     );
//     for c in formated.chars() {
//         c.is_wi
//     }
// }

fn is_single_line_comment(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("--");
}

fn is_multiple_line_comment_open(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("/*");
}

fn is_multiple_line_comment_close(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("*/");
}

fn find_multiple_line_comment_close(stmt: &str, start: usize) -> Option<usize> {
    let mut open_comment_count = 0;
    let mut index = start;
    while index < stmt.len() {
        if is_multiple_line_comment_open(stmt, index) {
            index += 2;
            open_comment_count += 1;
        }

        if is_multiple_line_comment_close(stmt, index) {
            index += 2;
            open_comment_count -= 1;
            if open_comment_count == 0 {
                return Some(index);
            }
        }

        index += 1;
    }

    None
}
