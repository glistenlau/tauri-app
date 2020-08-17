import {
  combineReducers,
  ThunkAction,
  Action,
  AnyAction,
} from "@reduxjs/toolkit";
import editor from "./editor";
import search from "./search";
import queryRunner from "./queryRunner";
import navigator from "./navigator";
import settings from "./settings";
import notification from "./notification";

import dataStore from "../apis/dataStore";
import { ActionType } from "../actions";
import transactionControl from "../features/transactionControl/transactionControlSlice";
import databaseConsole from "../features/databaseConsole/databaseConsoleSlice";
import runnerControl from "../features/runnerControl/runnerControlSlice";
import runnerResult from "../features/runnerResult/runnerResultSlice";
import schemaEditor from "../features/schemaEditor/schemaEditorSlice";
import editorSettings from "../features/editorSettings/editorSettingsSlice";
import propsEditor from "../features/propsEditor/propsEditorSlice";
import { persistReducer } from "redux-persist";


const persistConfig = {
  key: "root",
  storage: dataStore,
  timeout: 0,
  // throttle: 60000,
};

const appReducer = combineReducers({
  notification,
  editor,
  editorSettings,
  search,
  queryRunner,
  navigator,
  settings,
  transactionControl,
  databaseConsole,
  runnerControl,
  runnerResult,
  schemaEditor,
  propsEditor,
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