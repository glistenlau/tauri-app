use lazy_static::lazy_static;
use regex::Regex;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Lines, Result};
use std::path::Path;

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

    for (from, to) in &VAL_ESCAPE_PAIR[..] {
        escaped = escaped.replace(from, to);
    }

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
}

impl PropsKeyValue {
    fn new(lines_iter: Lines<BufReader<File>>) -> PropsKeyValue {
        PropsKeyValue {
            lines_iter
        }
    }
}

impl Iterator for PropsKeyValue {
    type Item = (String, String);

    fn next(&mut self) -> Option<(String, String)> {
        let mut key = String::new();
        let mut value: String = String::new();
    
        for line in &mut self.lines_iter {
            if let Err(e) = line {
                log::error!("iterate props file lines failed: {}", e);
                return None;
            }
            let mut line_value;
            let line_str = line.unwrap();
            println!("line string: {}", line_str);
            let trimmed_line = line_str.trim();
            if trimmed_line.starts_with('#') || trimmed_line.starts_with('!') {
                // The comment line, ignore
                continue;
            }
    
            let mut line_str = line_str.trim_end();
            if key.len() == 0 {
                match KEY_PATTERN.captures(line_str) {
                    Some(cap) => {
                        key = unescape_key(&cap[1]);
                        line_value = unescape_value(&cap[2]);
                    }
                    None => {
                        println!("not matched key: {}", line_str);
                        continue;
                    }
                };
            } else {
                line_value = unescape_value(line_str);
            }

            if (line_value.len() - line_value.trim_end_matches('\\').len()) % 2 == 1 {
                value.push_str(&line_value[..line_value.len() - 1]);
            } else if key.len() > 0 {
                value.push_str(&line_value);
                break;
            }
        }
    
        if key.len() > 0 {
            Some((key, unescape_value(&value)))
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
    let props_iter = PropsKeyValue::new(lines_iter);
    let mut map = HashMap::new();

    for (key, value) in props_iter {
        map.insert(key, value);
    }

    Ok(map)
}
