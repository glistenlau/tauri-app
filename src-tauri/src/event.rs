use std::sync::{Arc, Mutex};

use lazy_static::lazy_static;
use serde::Serialize;
use tauri::{event::emit, WebviewMut};

pub struct Emitter {
    webview: Option<WebviewMut>,
}

impl Emitter {
    fn new() -> Self {
        Self {
            webview: None,
        }
    }

    pub fn set_webview(&mut self, webview: WebviewMut) {
        self.webview = Some(webview);
    }

    pub fn emit<S>(&mut self, event: &str, payload: Option<S>) where S: Serialize {
        let wv = self.webview.as_mut().unwrap();
        match emit(wv, event.to_string(), payload) {
            Ok(_) => {}
            Err(err) => {
                log::error!("emit msg error: {}", err);
            }
        }
    }
}

lazy_static! {
  static ref INSTANCE: Arc<Mutex<Emitter>> = Arc::new(Mutex::new(Emitter::new()));
}

pub fn get_emitter() -> Arc<Mutex<Emitter>> {
    Arc::clone(&INSTANCE)
}
