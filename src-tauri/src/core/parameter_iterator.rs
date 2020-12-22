use std::cell::RefCell;

use oracle::{Statement as oracle_Statement, sql_type::ToSql as oracle_ToSql};
use serde::{Deserialize, Serialize};
use tokio_postgres::{Statement as pg_Statement, types::ToSql as pg_ToSql};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ParameterGenerateStrategy {
    Normal,
    Cartesian,
}

pub enum DBParamIter<'a> {
    Oracle(RefCell<ParameterIterator<'a, Box<dyn oracle_ToSql>, Option<oracle_Statement<'a>>>>),
    Postgres(RefCell<ParameterIterator<'a, Box<dyn pg_ToSql + Sync>, pg_Statement>>),
}

pub enum ParamSeeds<'a> {
    Oracle(Option<oracle_Statement<'a>>, Vec<Vec<Box<dyn oracle_ToSql>>>),
    Postgres(pg_Statement, Vec<Vec<Box<dyn pg_ToSql + Sync>>>),
}

pub enum PreparedStatement<'a> {
    Oracle(oracle_Statement<'a>),
    Postgres(pg_Statement),
}

pub struct ParameterIterator<'a, S: 'a, PS> {
    seeds: &'a [Vec<S>],
    prepared_stmt: PS,
    current_parameter_index: usize,
    current_indexes: Vec<usize>,
    mode: &'a ParameterGenerateStrategy,
    terminal_parameter_index: usize,
    drained: bool,
    total: usize,
}

impl<'a, S, PS> Iterator for ParameterIterator<'a, S, PS> {
    type Item = Vec<&'a S>;

    fn next(&mut self) -> Option<Vec<&'a S>> {
        if self.next_indexes().is_none() {
            return None;
        }

        let parameters = self
            .current_indexes
            .iter()
            .enumerate()
            .map(|(i, &ci)| self.seeds[i].get(ci).unwrap())
            .collect();
        Some(parameters)
    }
}

impl<'a, T, PS> ParameterIterator<'a, T, PS> {
    pub fn new(seeds: &'a [Vec<T>], mode: &'a ParameterGenerateStrategy, prepared_stmt: PS) -> Self {
        let terminal_parameter_index_opt = Self::find_terminal_parameter_index(seeds, mode);
        let (drained, terminal_parameter_index, total) = match terminal_parameter_index_opt {
            Some((tpi, t)) => (false, tpi, t),
            None => (false, 0, 1),
        };
        ParameterIterator {
            current_parameter_index: 0,
            current_indexes: vec![0; seeds.len()],
            drained,
            prepared_stmt,
            mode,
            seeds,
            terminal_parameter_index,
            total,
        }
    }

    fn find_terminal_parameter_index(
        seeds: &'a [Vec<T>],
        mode: &ParameterGenerateStrategy,
    ) -> Option<(usize, usize)> {
        if seeds.is_empty() || seeds.iter().any(|s| s.is_empty()) {
            return None;
        }
        match mode {
            ParameterGenerateStrategy::Normal => {
                let mut max_len_index = 0;
                let mut max_len = 0;
                for (i, seed) in seeds.iter().enumerate() {
                    if seed.len() > max_len {
                        max_len = seed.len();
                        max_len_index = i;
                    }
                }

                return Some((max_len_index, max_len));
            }
            ParameterGenerateStrategy::Cartesian => Some((
                seeds.len() - 1,
                seeds.iter().fold(1, |acc, s| acc * s.len()),
            )),
        }
    }

    pub fn prepared_stmt(&self) -> &PS {
        &self.prepared_stmt
    }

    pub fn total(&self) -> usize {
        self.total
    }

    pub fn drained(&self) -> bool {
        self.drained
    }

    pub fn current_indexes(&self) -> Vec<usize> {
        self.current_indexes.clone()
    }


    fn next_indexes(&mut self) -> Option<()> {
        match self.mode {
            ParameterGenerateStrategy::Normal => self.next_normal_indexes(),
            ParameterGenerateStrategy::Cartesian => self.next_cartesian_indexes(),
        }

        if self.drained {
            return None;
        }

        if self.seeds.is_empty() {
            self.drained = true;
            return None;
        }

        Some(())
    }

    fn next_normal_indexes(&mut self) {
        if self.drained {
            return;
        }
        if self.current_indexes.is_empty() {
            return;
        }
        for i in 0..self.current_indexes.len() {
            let ci = self.current_indexes[i];
            let len = self.seeds[i].len();
            if ci == len - 1 {
                if i == self.terminal_parameter_index {
                    self.drained = true;
                } else {
                    self.current_indexes[i] = 0;
                }
            } else {
                self.current_indexes[i] += 1;
            }
        }
    }

    fn next_cartesian_indexes(&mut self) {
        if self.drained {
            return;
        }
        if self.current_indexes.is_empty() {
            return;
        }

        let mut cur_idx = self.current_indexes[self.current_parameter_index];
        let mut len = self.seeds[cur_idx].len();

        if cur_idx == len - 1 {
            if self.current_parameter_index == self.terminal_parameter_index {
                self.drained = true;
                return;
            } else {
                self.current_indexes[self.current_parameter_index] = 0;
                self.current_parameter_index =
                    if self.current_parameter_index == self.seeds.len() - 1 {
                        0
                    } else {
                        self.current_parameter_index + 1
                    };
                cur_idx = self.current_indexes[self.current_parameter_index];
                len = self.seeds[cur_idx].len();
            }
        }

        self.current_indexes[self.current_parameter_index] =
            if cur_idx == len - 1 { 0 } else { cur_idx + 1 };
    }
}
