import { configureStore } from "@reduxjs/toolkit";
import { SnackbarProvider } from "notistack";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import thunk from "redux-thunk";
import "typeface-source-code-pro";
import "typeface-ubuntu-mono";
import App from "./App";
import "./index.css";
import rootReducer from "./reducers";

const middleware = [thunk].filter(Boolean);
const store = configureStore({
  reducer: rootReducer,
  middleware: middleware
});

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
