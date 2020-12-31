import { applyMiddleware, createStore } from "@reduxjs/toolkit";
import { SnackbarProvider } from "notistack";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import logger from "redux-logger";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import thunk from "redux-thunk";
import { composeWithDevTools } from "remote-redux-devtools";
import "typeface-source-code-pro";
import "typeface-ubuntu-mono";
import App from "./App";
import "./index.css";
import rootReducer from "./reducers";


const composeEnhancers = composeWithDevTools({
  realtime: false,
  name: "Your Instance Name",
  hostname: "localhost",
  port: 8098 // the port your remotedev server is running at
});

const middleware = [thunk, logger].filter(Boolean);
const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(...middleware))
);

export const persistor = persistStore(store);

ReactDOM.render(
  <Provider store={store}>
    <PersistGate persistor={persistor}>
      <SnackbarProvider maxSnack={3}>
        <App />
      </SnackbarProvider>
    </PersistGate>
  </Provider>,
  document.getElementById("root")
);
