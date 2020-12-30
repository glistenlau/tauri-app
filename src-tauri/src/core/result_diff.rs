use std::{cmp::Ordering, collections::HashMap};

use futures::io::empty;
use serde_json::Value;

pub type DiffResults = HashMap<usize, Vec<usize>>;

fn map_arr_len<E>(arr_opt: Option<&[E]>) -> usize {
    arr_opt.map_or(0, |arr| arr.len())
}

fn first_cmp<E>(x: &&Option<&[Vec<E>]>, y: &&Option<&[Vec<E>]>) -> Ordering {
    let x_len = x.map_or(0, |r| r.get(0).map_or(0, |arr| arr.len()));
    let y_len = y.map_or(0, |r| r.get(0).map_or(0, |arr| arr.len()));
    x_len.cmp(&y_len)
}

pub fn diff(results: &[Option<&[Vec<Value>]>]) -> Option<DiffResults> {
    let mut result: DiffResults = HashMap::new();
    if results.iter().any(|rst_opt| rst_opt.is_none()) {
        result.insert(usize::MAX, vec![]);
        return Some(result);
    }
    let max_row = results
        .iter()
        .max_by(|x, y| map_arr_len(x.as_deref()).cmp(&map_arr_len(y.as_deref())))
        .map_or(0, |v| map_arr_len(v.as_deref()));

    if max_row == 0 {
        return None;
    }

    let max_col = results
        .iter()
        .max_by(first_cmp)
        .map_or(0, |v| v.map_or(0, |r| r.get(0).map_or(0, |arr| arr.len())));

    if max_col == 0 {
        return None;
    }

    let empty_row = vec![];

    for row in 0..max_row {
        let rows: Vec<&Vec<Value>> = results
            .iter()
            .map(|rst| rst.map_or(&empty_row, |rs| rs.get(row).unwrap_or(&empty_row)))
            .collect();
        let row_diff_rst = diff_row(&rows, max_col);
        if !row_diff_rst.is_empty() {
            result.insert(row, row_diff_rst);
        }
    }

    if result.len() == 0 {
        return None;
    }
    Some(result)
}

fn diff_row(row_results: &[&Vec<Value>], max_col: usize) -> Vec<usize> {
    let mut row_diff_result = vec![];

    for col in 0..max_col {
        let cell_values: Vec<Option<&Value>> = row_results.iter().map(|r| r.get(col)).collect();
        let first_value = match cell_values.iter().find(|&&cell| cell.is_some()) {
            Some(Some(cv)) => cv,
            _ => continue,
        };

        let all_eq = cell_values
            .iter()
            .all(|cell| cell.map_or(false, |cv| cv.eq(*first_value)));
        if !all_eq {
            row_diff_result.push(col);
        }
    }

    row_diff_result
}
