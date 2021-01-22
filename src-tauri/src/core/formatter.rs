use sqlformat::FormatOptions;

pub fn format_sql(stmt: &str) -> String {
    let stmt_trim = stmt.trim();
    let formated = sqlformat::format(
        stmt_trim,
        &sqlformat::QueryParams::None,
        FormatOptions::default(),
    );

    correct_formatted(stmt_trim, &formated)
}

fn is_safe_char(c: char) -> bool {
    c.is_whitespace() || c == '(' || c == ')'
}

fn correct_formatted(original: &str, formated: &str) -> String {
    let ori_char_vec: Vec<char> = original.chars().collect();
    let fmt_char_vec: Vec<char> = formated.chars().collect();
    let mut ori_idx = 0;
    let mut fmt_idx = 0;
    let ori_len = ori_char_vec.len();
    let fmt_len = fmt_char_vec.len();
    let mut corrected = String::with_capacity(formated.len());

    while ori_idx < ori_len || fmt_idx < fmt_len {
        if None == ori_char_vec.get(ori_idx) {
            let remaining: String = fmt_char_vec[fmt_idx..].iter().collect();
            corrected.push_str(&remaining);
            break;
        }

        if None == fmt_char_vec.get(fmt_idx) {
            log::error!("Shouldn't have fmt_char_iter drained before ori_char_iter.");
            return original.to_string();
        }

        let cur_ori_char = ori_char_vec[ori_idx];
        let cur_fmt_char = fmt_char_vec[fmt_idx];

        if is_safe_char(cur_ori_char) {
            ori_idx += 1;
            continue;
        }

        if cur_ori_char != cur_fmt_char {
            if (ori_idx == 0 || is_safe_char(ori_char_vec[ori_idx - 1]))
                && is_safe_char(cur_fmt_char)
            {
                corrected.push(cur_fmt_char);
                fmt_idx += 1;
            } else if cur_fmt_char.is_whitespace() {
                // Unexpected space is formated string, ignore.
                fmt_idx += 1;
            } else {
                log::debug!(
                    "character mismatch, original: {}, index: {}; formated: {}, index: {}",
                    original,
                    ori_idx,
                    formated,
                    fmt_idx
                );
                // Character mismatch, something is wrong, just reutrn the original text.
                return original.to_string();
            }
        } else if cur_ori_char == '\'' {
            let nxt_ori_idx = find_close_qoute_index(original, ori_idx + 1);
            let nxt_fmt_idx = find_close_qoute_index(formated, fmt_idx + 1);

            if nxt_ori_idx.is_none() || nxt_fmt_idx.is_none() {
                // Single qoute not close correctly, just add the remainning original text.
                let remainning: String = ori_char_vec[ori_idx..].iter().collect();
                corrected.push_str(&remainning);
                break;
            }
            corrected.push_str(
                &ori_char_vec[ori_idx..nxt_ori_idx.unwrap()]
                    .iter()
                    .collect::<String>(),
            );
            ori_idx = nxt_ori_idx.unwrap();
            fmt_idx = nxt_fmt_idx.unwrap();
        } else if is_single_line_comment_start(original, ori_idx) {
            let ori_idx_delta_opt = &ori_char_vec[ori_idx..].iter().position(|&c| c == '\n');
            let fmt_idx_delta_opt = &fmt_char_vec[fmt_idx..].iter().position(|&c| c == '\n');

            if let Some(fmt_idx_delta) = fmt_idx_delta_opt {
                corrected.push_str(
                    &fmt_char_vec[fmt_idx..fmt_idx + fmt_idx_delta + 1]
                        .iter()
                        .collect::<String>(),
                );
                fmt_idx += fmt_idx_delta + 1;
            } else {
                corrected.push_str(&fmt_char_vec[fmt_idx..].iter().collect::<String>());
            }

            ori_idx += ori_idx_delta_opt.unwrap_or(2) + 1;
        } else if is_multiple_line_comment_open(original, ori_idx) {
            let nxt_ori_idx_opt = find_multiple_line_comment_close(original, ori_idx);
            if nxt_ori_idx_opt.is_none() {
                corrected.push_str(&ori_char_vec[ori_idx..].iter().collect::<String>());
                break;
            }
            let nxt_fmt_idx_opt = find_multiple_line_comment_close(original, fmt_idx);
            ori_idx = nxt_ori_idx_opt.unwrap();
            fmt_idx = nxt_fmt_idx_opt.unwrap_or(fmt_idx);
        } else {
            corrected.push(cur_ori_char);
            ori_idx += 1;
            fmt_idx += 1;
        }
    }

    corrected
}

fn is_single_line_comment_start(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("--");
}

fn is_multiple_line_comment_open(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("/*");
}

fn is_multiple_line_comment_close(stmt: &str, start: usize) -> bool {
    return start + 1 < stmt.len() && stmt[start..start + 2].eq("*/");
}

fn find_close_qoute_index(stmt: &str, start: usize) -> Option<usize> {
    let mut index = start;
    while index < stmt.len() {
        match stmt[start..].find('\'').map(|idx| idx + start) {
            Some(idx) => {
                if Some('\'') == stmt.chars().nth(idx + 1) {
                    // two qoutes escape a qoute in SQL
                    index = idx + 2;
                    continue;
                }
                return Some(idx + 1);
            }
            None => {
                return None;
            }
        }
    }

    None
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
