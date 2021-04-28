use std::fs::File;
use std::io::{BufRead, BufReader, Lines, Result};
use std::path::Path;
use std::{cmp, collections::HashMap, fs};

use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref KEY_PATTERN: Regex =
        Regex::new(r"\s*((?:\\ |\\=|\\:|[^:= ])*)[ |\t|\f]*[=|:]?\s*(.*)").unwrap();
    static ref KEY_ESCAPE_PAIR: Vec<(&'static str, &'static str)> =
        vec![(" ", "\\ "), ("=", "\\="), (":", "\\:"),];
    static ref VAL_ESCAPE_PAIR: Vec<(&'static str, &'static str)> =
        vec![("\r", "\\r"), ("\n", "\\n"), ("\\", "\\\\"),];
}

fn escape_key(key: &str) -> String {
    let mut escaped = String::from(key);

    for (from, to) in &KEY_ESCAPE_PAIR[..] {
        escaped = escaped.replace(from, to);
    }

    escaped
}

fn unescape_key(key: &str) -> String {
    let mut escaped = String::from(key);

    for (to, from) in &KEY_ESCAPE_PAIR[..] {
        escaped = escaped.replace(from, to);
    }

    escaped
}

fn escape_value(key: &str) -> String {
    let mut escaped = String::from(key);

    for (from, to) in VAL_ESCAPE_PAIR.iter().rev() {
        escaped = escaped.replace(from, to);
    }

    escaped = escaped.replace("\\r", " \\r\\\n");
    escaped = escaped.replace("\\n", " \\n\\\n");

    escaped
}

fn unescape_value(key: &str) -> String {
    let mut escaped = String::from(key);

    for (to, from) in &VAL_ESCAPE_PAIR[..] {
        escaped = escaped.replace(from, to);
    }

    escaped
}

struct PropsKeyValue {
    lines_iter: Lines<BufReader<File>>,
    cur_line: Option<usize>,
    collect_lines: bool,
    return_prop_value: bool,
    lines: Option<Vec<String>>,
}

impl<'a> PropsKeyValue {
    fn new(
        lines_iter: Lines<BufReader<File>>,
        collect_lines: bool,
        return_prop_value: bool,
    ) -> PropsKeyValue {
        PropsKeyValue {
            collect_lines,
            lines_iter,
            return_prop_value,
            cur_line: None,
            lines: None,
        }
    }

    fn get_lines(&self) -> Option<&[String]> {
        return self.lines.as_deref();
    }
}

impl Iterator for PropsKeyValue {
    type Item = (String, String, usize, usize);

    fn next(&mut self) -> Option<(String, String, usize, usize)> {
        let mut key = String::new();
        let mut value: String = String::new();
        let mut start_line = None;
        let end_line;

        for line in &mut self.lines_iter {
            if let Err(e) = line {
                log::error!("iterate props file lines failed: {}", e);
                return None;
            }

            match self.cur_line {
                Some(pre_line) => self.cur_line = Some(pre_line + 1),
                None => self.cur_line = Some(0),
            }

            let line_value;
            let line_str = line.unwrap();

            if self.collect_lines {
                match &mut self.lines {
                    Some(line_vec) => line_vec.push(line_str.to_string()),
                    None => self.lines = Some(vec![line_str.to_string()]),
                }
            }

            let trimmed_line = line_str.trim();
            if trimmed_line.starts_with('#') || trimmed_line.starts_with('!') {
                // The comment line, ignore
                continue;
            }

            let line_str = line_str.trim_end();
            if key.len() == 0 {
                match KEY_PATTERN.captures(line_str) {
                    Some(cap) => {
                        key = unescape_key(&cap[1]);
                        line_value = unescape_value(&cap[2]);
                        start_line = self.cur_line;
                    }
                    None => {
                        continue;
                    }
                };
            } else {
                line_value = unescape_value(line_str);
            }

            if (line_value.len() - line_value.trim_end_matches('\\').len()) % 2 == 1 {
                if self.return_prop_value {
                    value.push_str(&line_value[..line_value.len() - 1]);
                }
            } else if key.len() > 0 {
                if self.return_prop_value {
                    value.push_str(&line_value);
                }
                break;
            }
        }

        if key.len() > 0 {
            end_line = self.cur_line;
            Some((
                key,
                unescape_value(&value),
                start_line.unwrap(),
                end_line.unwrap(),
            ))
        } else {
            None
        }
    }
}

pub fn read_lines<P: AsRef<Path>>(filepath: P) -> Result<Lines<BufReader<File>>> {
    let file = File::open(filepath)?;
    Ok(BufReader::new(file).lines())
}

pub fn parse_prop_file<P: AsRef<Path>>(filepath: P) -> Result<HashMap<String, String>> {
    let lines_iter = read_lines(filepath)?;
    let props_iter = PropsKeyValue::new(lines_iter, false, true);
    let mut map = HashMap::new();

    for (key, value, _, _) in props_iter {
        map.insert(key, value);
    }

    Ok(map)
}

pub fn save_prop<P: AsRef<Path>>(filepath: P, prop_key: &str, prop_value: &str) -> Result<()> {
    let prop_str = format!(
        "\n{}=\\n\\\n{}\n",
        escape_key(prop_key),
        escape_value(prop_value.trim())
    );
    let file_str = match read_lines(filepath.as_ref()) {
        Ok(lines_iter) => {
            let mut props_iter = PropsKeyValue::new(lines_iter, true, false);
            let mut start = None;
            let mut end = None;

            while let Some((key, _, start_line, end_line)) = props_iter.next() {
                if prop_key.to_lowercase() == key.to_lowercase() {
                    start = Some(start_line);
                    end = Some(end_line);
                }
            }

            let line_vec = props_iter.get_lines();

            match line_vec {
                Some(line_str_vec) => {
                    if start.is_none() && end.is_none() {
                        let pre_prop = line_str_vec.join("\n");
                        [pre_prop.trim_end(), &prop_str].join("\n")
                    } else if line_str_vec.len() == 0 {
                        [&prop_str, ""].join("\n")
                    } else {
                        let pre_prop = line_str_vec[0..start.unwrap()].join("\n");
                        let post_prop = line_str_vec
                            [cmp::min(end.unwrap() + 1, line_str_vec.len() - 1)..]
                            .join("\n");
                        [pre_prop.trim_end(), &prop_str, post_prop.trim_start()].join("\n")
                    }
                }
                None => [&prop_str, ""].join("\n"),
            }
        }
        Err(_) => prop_str,
    };

    fs::write(filepath, file_str)?;

    Ok(())
}
