import {
  combineReducers,
  ThunkAction,
  Action,
  AnyAction,
} from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";

import databaseConsole from "../features/databaseConsole";
import dataStore from "../apis/dataStore";
import ActionType from "../actionType";

const persistConfig = {
  key: "root",
  storage: dataStore,
  timeout: 0,
  throttle: 60000,
};
const appReducer = combineReducers({
  databaseConsole
});

export type RootState = ReturnType<typeof appReducer>;

const rootReducer = (state: RootState | undefined, action: AnyAction): RootState => {
  if (action.type === ActionType.RESET_APP) {
    state = undefined;
  }

  return appReducer(state, action);
};

export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

export default persistReducer(persistConfig, rootReducer);