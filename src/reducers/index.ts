import {
  Action,
  AnyAction,
  combineReducers,
  ThunkAction,
} from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import { ActionType } from "../actions";
import dataStore from "../apis/dataStore";
import databaseConsole from "../features/databaseConsole/databaseConsoleSlice";
import editorSettings from "../features/editorSettings/editorSettingsSlice";
import propsEditor from "../features/propsEditor/propsEditorSlice";
import queryScan from "../features/queryScan/queryScanSlice";
import runnerControl from "../features/runnerControl/runnerControlSlice";
import runnerResult from "../features/runnerResult/runnerResultSlice";
import schemaEditor from "../features/schemaEditor/schemaEditorSlice";
import settings from "../features/settings/settingsSlice";
import transactionControl from "../features/transactionControl/transactionControlSlice";
import editor from "./editor";
import navigator from "./navigator";
import notification from "./notification";
import search from "./search";

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
  queryScan,
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

const rootReducer = (
  state: RootState | undefined,
  action: AnyAction
): RootState => {
  if (action.type === ActionType.RESET_APP) {
    state = undefined;
  }
  return appReducer(state, action);
};

export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

export default persistReducer(persistConfig, rootReducer);
