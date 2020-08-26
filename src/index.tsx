import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { persistStore } from "redux-persist";
import { configureStore } from "@reduxjs/toolkit";
import { PersistGate } from "redux-persist/integration/react";
import thunk from "redux-thunk";
import logger from 'redux-logger';
import { SnackbarProvider } from "notistack";
import "typeface-roboto";

import rootReducer from "./reducers";
import "./index.css";
import App from "./App";


const middleware = [thunk, logger].filter(Boolean);
const store = configureStore({
  reducer: rootReducer,
  middleware: middleware,
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
