use anyhow::{anyhow, Result};
use std::collections::{HashMap, VecDeque};

const OPEN_COMMENT: &str = "<!--";
const CLOSE_COMMENT: &str = "-->";
const OPEN_CDATA: &str = "<![CDATA[";
const CLOSE_CDATA: &str = "]]>";
const OPEN_DOCTYPE: &str = "<!DOCTYPE";
const CLOSE_DOCTYPE: &str = "]>";
const OPEN_XML_PROLOG: &str = "<?xml";
const CLOSE_XML_PROLOG: &str = "?>";

const COMMENT_TAG_PATTERN: &[&str; 3] = &[OPEN_COMMENT, CLOSE_COMMENT, "Comment"];

const SPECIAL_TAGS: &[&[&str; 3]] = &[
    &[OPEN_CDATA, CLOSE_CDATA, "CDATA"],
    &[OPEN_DOCTYPE, CLOSE_DOCTYPE, "DOCTYPE"],
    &[OPEN_XML_PROLOG, CLOSE_XML_PROLOG, "XMLPROLOG"],
];

fn find_in_chars(chars: &[char], target: &str, start: usize) -> Option<usize> {
    let target_first_char_opt = target.chars().next();
    if target_first_char_opt.is_none() {
        return None;
    }
    let target_first_char = target_first_char_opt.unwrap();
    chars[start..]
        .iter()
        .enumerate()
        .position(|(offset, c)| {
            let index = start + offset;
            if chars.len() - index < target.len() {
                return false;
            }
            if !c.eq(&target_first_char) {
                return false;
            }

            chars[index..index + target.len()]
                .iter()
                .collect::<String>()
                .eq(target)
        })
        .map(|offset| start + offset)
}

fn process_tag_pattern(text: &[char], start: usize, pattern: &[&str; 3]) -> Result<Option<usize>> {
    let [open_tag, close_tag, tag_name] = pattern;
    if start + open_tag.len() > text.len()
        || !text[start..start + open_tag.len()]
            .iter()
            .collect::<String>()
            .eq(open_tag)
    {
        return Ok(None);
    }

    let close_index = find_in_chars(text, close_tag, start + open_tag.len());

    if close_index.is_none() {
        return Err(anyhow!("Unclosed tag: {}", tag_name));
    }

    Ok(close_index)
}

fn process_comment_tag(
    text: &[char],
    start: &mut usize,
    pending_comment_start: &mut isize,
) -> Result<bool> {
    if let Some(close_index) = process_tag_pattern(text, *start, COMMENT_TAG_PATTERN)? {
        if *pending_comment_start != -1 {
            *pending_comment_start = close_index as isize;
        }
        *start = close_index;
        return Ok(true);
    }
    return Ok(false);
}

fn process_special_tags(text: &[char], start: &mut usize) -> Result<bool> {
    for tag_pattern in SPECIAL_TAGS {
        if let Some(close_index) = process_tag_pattern(text, *start, tag_pattern)? {
            *start = close_index;
            return Ok(true);
        }
    }

    Ok(false)
}

fn process_tag(text: &[char], start: &mut usize) -> Result<ProcessTagResult> {
    if *start + 1 < text.len() && text[*start] == '<' && text[*start + 1] == '/' {
        match text[*start + 2..]
            .iter()
            .position(|&c| c == '>')
            .map(|p| *start + 2 + p)
        {
            Some(end_index) => {
                let tag_name = text[*start + 2..end_index]
                    .iter()
                    .collect::<String>()
                    .trim()
                    .to_string();
                *start = end_index;
                return Ok(ProcessTagResult::TagClose(tag_name, end_index));
            }
            None => {
                return Err(anyhow!("Invliad XML format."));
            }
        }
    }

    let mut attr_left = *start + 1;
    while attr_left < text.len()
        && !text[attr_left].is_whitespace()
        && text[attr_left] != '>'
        && text[attr_left] != '/'
    {
        attr_left += 1;
    }

    if attr_left == text.len() {
        return Err(anyhow!("Invalid XML format."));
    }

    let tag_name = text[*start + 1..attr_left].iter().collect::<String>();
    let mut xml_tag = XmlTag::new(tag_name);
    xml_tag.start_offset = *start;
    let mut attr_right = attr_left;

    while attr_right < text.len() {
        let cur_char = text[attr_right];
        if cur_char == '/' && attr_right + 1 < text.len() && text[attr_right + 1] == '>' {
            xml_tag.end_offset = attr_right + 1;
            *start = attr_right + 1;
            return Ok(ProcessTagResult::TagSelfClose(xml_tag, attr_right + 1));
        }

        if cur_char == '>' {
            *start = attr_right;
            return Ok(ProcessTagResult::TagStart(xml_tag, attr_right));
        }

        if cur_char == '=' {
            let attr_name = text[attr_left..attr_right]
                .iter()
                .collect::<String>()
                .trim()
                .to_string();
            let mut attr_value = "".to_string();
            let mut open_qoute = None;

            for attr_index in attr_right + 1..text.len() {
                let attr_char = text[attr_index];
                if open_qoute.is_none() && (attr_char == '\'' || attr_char == '"') {
                    open_qoute = Some((attr_char, attr_index));
                    continue;
                }
                if let Some((qoute_char, qoute_index)) = open_qoute {
                    if attr_char != qoute_char {
                        continue;
                    }

                    attr_value = text[qoute_index + 1..attr_index]
                        .iter()
                        .collect::<String>()
                        .to_string();
                    attr_left = attr_index + 1;
                    attr_right = attr_index;
                    break;
                }
            }

            xml_tag.attrs.insert(attr_name.to_lowercase(), attr_value);
        }
        attr_right += 1;
    }

    return Err(anyhow!("Invalid XML format."));
}

enum ProcessTagResult {
    TagStart(XmlTag, usize),
    TagClose(String, usize),
    TagSelfClose(XmlTag, usize),
}

#[derive(Debug, Default)]
pub struct XmlTag {
    tag_name: String,
    attrs: HashMap<String, String>,
    start_offset: usize,
    end_offset: usize,
    children: Vec<XmlTag>,
}

impl XmlTag {
    fn new(tag_name: String) -> Self {
        Self {
            tag_name,
            ..Default::default()
        }
    }

    pub fn children(&self) -> &[XmlTag] {
        &self.children
    }

    pub fn attrs(&self) -> &HashMap<String, String> {
        &self.attrs
    }

    pub fn range(&self) -> (usize, usize) {
        (self.start_offset, self.end_offset)
    }

    pub fn tag_name(&self) -> &str {
        &self.tag_name
    }
}

pub fn parse_xml(text: &str) -> Result<XmlTag> {
    let text_char_vec: Vec<char> = text.chars().collect();

    let mut root_tag = XmlTag::new("root".to_string());
    root_tag.start_offset = 0;
    root_tag.end_offset = text_char_vec.len() - 1;

    let mut tag_stack: VecDeque<XmlTag> = vec![root_tag].into_iter().collect();
    let mut pending_comment_start_index: isize = -1;
    let mut index = 0;

    while index < text_char_vec.len() {
        let cur_char = text_char_vec[index];

        if cur_char != '<' {
            index += 1;
            continue;
        }
        if process_special_tags(&text_char_vec, &mut index)? {
            index += 1;
            continue;
        } else if process_comment_tag(&text_char_vec, &mut index, &mut pending_comment_start_index)?
        {
            index += 1;
            continue;
        }

        match process_tag(&text_char_vec, &mut index)? {
            ProcessTagResult::TagStart(mut new_xml_tag, _end_index) => {
                if pending_comment_start_index != -1 {
                    new_xml_tag.start_offset = pending_comment_start_index as usize;
                    pending_comment_start_index = -1;
                }
                tag_stack.push_back(new_xml_tag);
            }
            ProcessTagResult::TagClose(close_xml_name, end_index) => match tag_stack.pop_back() {
                Some(mut xml_tag) => {
                    if close_xml_name != xml_tag.tag_name {
                        return Err(anyhow!(""));
                    }
                    xml_tag.end_offset = end_index;
                    tag_stack
                        .back_mut()
                        .map(|parent| parent.children.push(xml_tag));
                }
                None => {
                    return Err(anyhow!(""));
                }
            },
            ProcessTagResult::TagSelfClose(mut new_xml_tag, _end_index) => {
                if pending_comment_start_index != -1 {
                    new_xml_tag.start_offset = pending_comment_start_index as usize;
                    pending_comment_start_index = -1;
                }

                tag_stack
                    .back_mut()
                    .map(|parent| parent.children.push(new_xml_tag));
            }
        }

        index += 1;
    }

    if tag_stack.len() != 1 {
        return Err(anyhow!(""));
    }

    Ok(tag_stack.pop_back().unwrap())
}

#[cfg(test)]
mod tests {
    use regex::{escape, Regex};

    use std::{env, fs::File, io::Read};

    use glob::glob;

    use super::*;

    fn valid_xml_tag(root_tag: &XmlTag, text: &[char]) {
        let start_index = root_tag.start_offset;
        let end_index = root_tag.end_offset;
        let prefix = format!("<{}", root_tag.tag_name);
        let appendfix = '>';

        let actual_prefix = text[start_index..start_index + prefix.len()]
            .iter()
            .collect::<String>();
        let actual_appendfix = text[end_index];

        assert_eq!(
            prefix, actual_prefix,
            "tag prefix mismatch, expect: {}, acutal: {}",
            prefix, actual_prefix
        );
        assert_eq!(
            appendfix, actual_appendfix,
            "tag appendfix mismatch, expect: {}, actual: {}",
            appendfix, actual_prefix
        );

        let whole_str = text[start_index..end_index + 1].iter().collect::<String>();

        for (key, value) in &root_tag.attrs {
            let re = Regex::new(&format!(
                "(?i){}\\s*=\\s*[\"']{}[\"']",
                escape(key),
                escape(value)
            ))
            .unwrap();
            assert!(
                re.is_match(&whole_str),
                "there should be attribute {}=\"{}\" in {}",
                key,
                value,
                whole_str[0..whole_str.find('>').unwrap()].to_string()
            );
        }

        for child in &root_tag.children {
            valid_xml_tag(child, text);
        }
    }
    #[test]
    fn test_xml_parser() {
        let planning_path = env::var("PLANNING_PATH").unwrap();
        assert!(planning_path.len() > 0, "Should have planning path.");

        for entry in glob(&format!("{}/src/db/**/*.xml", planning_path)).unwrap() {
            let path = entry.unwrap();

            let mut file = File::open(path).unwrap();
            let mut file_str = String::new();
            file.read_to_string(&mut file_str).unwrap();

            let parse_result = parse_xml(&file_str);
            assert!(
                parse_result.is_ok(),
                "there should be no error, but got {}",
                parse_result.unwrap_err()
            );

            for child in &parse_result.unwrap().children {
                valid_xml_tag(child, &file_str.chars().collect::<Vec<char>>());
            }
        }
    }
}
