import { createAction } from "@reduxjs/toolkit";
import { VariantType } from "notistack";
import { DB_TYPE } from "../core/databaseConsole";
import { DiffResultViewType } from "../core/dbResultDiff";
import oracleClient from "../core/oracle";
import { evaluateOracle, evaluatePostgres } from "../core/parameterEvaluator";
import postgresClient from "../core/postgres";
import {
  loadOracleProperties,
  loadPostgresProperties,
  writeOracleProp,
  writePgProp,
} from "../core/propertiesLoader";
import {
  changeCurrentParametersPair,
  changeDiffRowCount,
  changePanelExpand,
  changeProcessedCount,
  changeProcessedRowCount,
  changeResultPair,
  changeTimeElapsedPair,
  changeTotalCount,
} from "../features/runnerResult/runnerResultSlice";
import { changeUncommitCount } from "../features/transactionControl/transactionControlSlice";
import { PropsObj } from "../reducers/editor";

export enum ActionType {
  LOAD_PROPS_FILES = "LOAD_PROPS_FILES",
  LOAD_PERSISTOR = "LOAD_PERSISTOR",
  SELECT_CLASS_NAME = "SELECT_CLASS_NAME",
  SELECT_PROP_KEY = "SELECT_PROP_KEY",
  CHANGE_PROP_VALUE = "CHANGE_PROP_VALUE",
  CHANGE_SEARCH_FILE_PATH = "CHANGE_SEARCH_FILE_PATH",
  CHANGE_SEARCH_CLASS = "CHANGEM_SEARCH_CLASS",
  OPEN_PARAMETER_MODAL = "OPEN_PARAMETER_MODAL",
  CLOSE_PARAMETER_MODAL = "CLOSE_PARAMETER_MODAL",
  CHANGE_ACTIVE_VIEW = "CHANGE_ACTIVE_VIEW",
  CHANGE_PARAMETERS = "CHANGE_PARAMETERS",
  CHANGE_PARAMETER_RAW = "CHANGE_PARAMETER_RAW",
  CHANGE_LEFT_PANEL_WIDTH = "CHANGE_LEFT_PANEL_WIDTH",
  TOOGLE_CARTESIAN = "TOOGLE_CARTESIAN",
  CHANGE_ORACLE_SETTING = "CHANGE_ORACLE_SETTING",
  CHANGE_POSTGRES_SETTING = "CHANGE_POSTGRES_SETTING",
  TOOGLE_SYNC = "TOOGLE_SYNC",
  RUN_QUERY = "RUN_QUERY",
  INIT_APP = "INIT_APP",
  ENQUEUE_NOTIFICATION = "SHOW_NOTIFICATION",
  EXIT_NOTIFICATION = "PROCESSED_NOTIFICATION",
  RESET_APP = "RESET_APP",
}

export const processedNotification = (key: string) => ({
  type: ActionType.EXIT_NOTIFICATION,
  key,
});

export const showNotification = (
  text: string,
  variant: VariantType,
  key?: string
) => ({
  type: ActionType.ENQUEUE_NOTIFICATION,
  key: key || Date.now().toString(10),
  text,
  variant,
});

export const changeOracleSetting = (oracleSetting: any) => ({
  type: ActionType.CHANGE_ORACLE_SETTING,
  oracleSetting,
});

export const changePostgresSetting = (postgresSetting: any) => ({
  type: ActionType.CHANGE_POSTGRES_SETTING,
  postgresSetting,
});

export const changeActiveView = (activeView: number) => ({
  type: ActionType.CHANGE_ACTIVE_VIEW,
  activeView,
});

export const changeLeftPanelWidth = (width: number) => ({
  type: ActionType.CHANGE_LEFT_PANEL_WIDTH,
  width,
});

export const initialState = () => ({
  type: ActionType.INIT_APP,
});

export const changeSearchFilePath = (filePath: string) => ({
  type: ActionType.CHANGE_SEARCH_FILE_PATH,
  filePath,
});
export const changeSearchClassName = (className: string) => ({
  type: ActionType.CHANGE_SEARCH_CLASS,
  className,
});
export const loadPropsFiles = (
  oracleProps: PropsObj,
  postgresProps: PropsObj,
  validateResults: PropsObj
) => ({
  type: ActionType.LOAD_PROPS_FILES,
  oracleProps,
  postgresProps,
  validateResults,
});

export const loadPersistor = (persistor: any) => ({
  type: ActionType.LOAD_PERSISTOR,
  persistor,
});

export const selectClassName = (className: string) => ({
  type: ActionType.SELECT_CLASS_NAME,
  className,
});

export const selectPropKey = (propKey: string) => ({
  type: ActionType.SELECT_PROP_KEY,
  propKey,
});

export const changePropValue = (values: Array<string>) => ({
  type: ActionType.CHANGE_PROP_VALUE,
  values,
});

export const runQuery = (queries: Array<string>) => ({
  type: ActionType.RUN_QUERY,
  queries,
});

export const toggleCartesian = () => ({
  type: ActionType.TOOGLE_CARTESIAN,
});

export const toggleSync = () => ({
  type: ActionType.TOOGLE_SYNC,
});

export const openParameterModal = (
  statements: Array<string>,
  parameters: Array<any>,
  sync: boolean
) => ({
  type: ActionType.OPEN_PARAMETER_MODAL,
  statements,
  parameters,
  sync,
});

export const closeParameterModal = () => ({
  type: ActionType.CLOSE_PARAMETER_MODAL,
});

export const changeParamRawValue = (
  raw: string,
  dbIndex: number,
  paramIndex: number
) => ({
  type: ActionType.CHANGE_PARAMETER_RAW,
  raw,
  dbIndex,
  paramIndex,
});

export const changeParameters = (parameters: Array<any>) => ({
  type: ActionType.CHANGE_PARAMETERS,
  parameters,
});

export enum EditorMode {
  NORMAL = "NORMAL",
  DIFF = "DIFF",
}

function* makeCircularGenerator(
  arr: Array<any>
): Generator<any, void, boolean> {
  const size = arr.length;
  let cycleCount = 0;
  let index = 0;
  let reset = false;
  let val = 0;
  while (true) {
    val = arr[index++];
    yield { cycleCount, val, reset };

    reset = false;
    if (index === size) {
      index = 0;
      cycleCount++;
      reset = true;
    }
  }
}

function* makeMaxGenerator(params: Array<Array<any>>) {
  const gens = params.map(makeCircularGenerator);
  let count = Math.max(...params.map((p) => p.length));

  while (count--) {
    yield gens.map((g) => g.next().value.val);
  }
}

function* makeCartesianGenerator(params: Array<Array<any>>) {
  let count = params.reduce((agg, p) => agg * p.length, 1);
  const gens = params.map(makeCircularGenerator);
  let nextValues = gens.map((g) => g.next().value.val);

  while (count--) {
    yield [...nextValues];

    for (let i = params.length - 1; i >= 0; i--) {
      const nextVal = gens[i].next().value;
      nextValues[i] = nextVal.val;
      if (!nextVal.reset) {
        break;
      }
    }
  }
}

function* makeEmptyGenerator(): Generator<[], any, boolean> {
  yield [];
}

export const saveProp =
  (
    classPath: string,
    propKey: string,
    values: Array<string>,
    saveTarget: number
  ) =>
  async (dispatch: Function) => {
    const ret: any = {};
    if (saveTarget === 0 || saveTarget === 2) {
      try {
        await writePgProp(classPath, propKey, values[1]);
        dispatch(
          showNotification(
            `Saved ${propKey} to the Postgres properties file.`,
            "success"
          )
        );
        ret.postgres = { success: true };
      } catch (e) {
        dispatch(
          showNotification(
            `Failed to Save ${propKey} to the Postgres properties file.`,
            "error"
          )
        );
        ret.postgres = { success: false, error: e };
      }
    }

    if (saveTarget === 1 || saveTarget === 2) {
      try {
        await writeOracleProp(classPath, propKey, values[0]);
        dispatch(
          showNotification(
            `Saved ${propKey} to the Oracle properties file.`,
            "success"
          )
        );
        ret.oracle = { success: true };
      } catch (e) {
        dispatch(
          showNotification(
            `Failed to Save ${propKey} the to Oracle properties file.`,
            "error"
          )
        );
        ret.oracle = { success: false, error: e };
      }
    }

    return ret;
  };

export const initApp = createAction("initApp");
