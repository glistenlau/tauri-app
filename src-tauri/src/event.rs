use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{WebviewMut, event::emit};
use lazy_static::lazy_static;


pub struct Emitter<'a> {
  webview: Option<WebviewMut>,
  test: &'a str,
}

impl<'a> Emitter<'a> {
  fn new() -> Self {
    Self {
      webview: None,
      test: "test",
    }
  }

  pub fn set_webview(&mut self, webview: WebviewMut) {
    self.webview = Some(webview);
  }

  pub fn emit<S>(&mut self, event: &str, payload: Option<S>) where S: Serialize {
    let mut wv = self.webview.as_mut().unwrap();
    emit(wv, event.to_string(), payload);
  }
}

lazy_static! {
  static ref INSTANCE: Arc<Mutex<Emitter<'static>>> = Arc::new(Mutex::new(Emitter::new()));
}

pub fn get_emitter() -> Arc<Mutex<Emitter<'static>>> {
  Arc::clone(&INSTANCE)
}
