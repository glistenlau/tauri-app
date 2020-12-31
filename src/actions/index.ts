import { createAction } from "@reduxjs/toolkit";
import { VariantType } from "notistack";
import { Parameter } from "../containers/QueryRunner";
import { DB_TYPE } from "../core/databaseConsole";
import { diffAndMapToView, DiffResultViewType } from "../core/dbResultDiff";
import oracleClient from "../core/oracle";
import { evaluateOracle, evaluatePostgres } from "../core/parameterEvaluator";
import postgresClient from "../core/postgres";
import {
  loadOracleProperties,
  loadPostgresProperties,
  writeOracleProp,
  writePgProp
} from "../core/propertiesLoader";
import QueryRunner from "../core/queryRunner";
import {
  changeCurrentParametersPair, changeDiffRowCount, changePanelExpand,
  changeProcessedCount,

  changeProcessedRowCount,

  changeResultPair,

  changeTimeElapsedPair, changeTotalCount
} from "../features/runnerResult/runnerResultSlice";
import { changeUncommitCount } from "../features/transactionControl/transactionControlSlice";
import { PropsObj } from "../reducers/editor";
import { addTimeElapsed, updateArrayElement } from "../util";


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

const countParams = (params: Array<Parameter>, cartesian: boolean): number => {
  if (cartesian) {
    return params.reduce((agg, p) => agg * p.evaluated.value.length, 1);
  } else {
    return params.reduce(
      (agg, p) => Math.max(agg, p.evaluated.value.length),
      0
    );
  }
};

const countParamsPair = (
  paramsPair: Array<Array<Parameter>>,
  cartesian: boolean
) => {
  return paramsPair.map((p) => {
    const count = countParams(p, cartesian);
    return count;
  });
};

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

const getParamGenerator = (params: Array<Parameter>, cartesian: boolean) => {
  if (!params || params.length === 0) {
    return makeEmptyGenerator();
  }

  const paramVals = params.map((p) => p.evaluated.value);
  return cartesian
    ? makeCartesianGenerator(paramVals)
    : makeMaxGenerator(paramVals);
};

export const scanRunQuery = (
  statements: Array<string>,
  parameters: Array<Array<Parameter>>,
  schema: string,
  cartesian: boolean,
  sortResults?: boolean
) => async (dispatch: Function) => {
  try {
    const countPair = countParamsPair(parameters, cartesian);
    const oraParamGen = getParamGenerator(parameters[0], cartesian);
    const pgParamGen = getParamGenerator(parameters[1], cartesian);

    let oraParam = oraParamGen.next();
    let pgParam = pgParamGen.next();
    let processedResult: DiffResultViewType;
    let rowCount = 0;
    let runCount = 0;
    let oracleElapsed: [number, number] = [0, 0];
    let postgresElapsed: [number, number] = [0, 0];

    const totalRun = Math.min(...countPair) || 1;
    dispatch(changeProcessedCount(0));
    dispatch(changeTotalCount(totalRun));
    dispatch(changeProcessedRowCount(0));
    dispatch(changeDiffRowCount(0));
    dispatch(changeIsRunning(true));

    while (!oraParam.done && !pgParam.done) {
      const query = {
        oracle: {
          statement: statements[0],
          parameters: oraParam.value,
        },
        postgres: {
          statement: statements[1],
          parameters: pgParam.value,
        },
      };

      dispatch(changeCurrentParametersPair([oraParam.value, pgParam.value]));

      const result = await QueryRunner.runQuery(query, schema);

      processedResult = diffAndMapToView(result[0], result[1], sortResults);

      if (result[0].elapsed) {
        oracleElapsed = addTimeElapsed(oracleElapsed, result[0].elapsed);
      }
      if (result[1].elapsed) {
        postgresElapsed = addTimeElapsed(postgresElapsed, result[1].elapsed);
      }

      rowCount += processedResult.rowCount;
      runCount++;

      dispatch(changeTimeElapsedPair([oracleElapsed, postgresElapsed]));
      dispatch(changeProcessedRowCount(rowCount));
      dispatch(changeProcessedCount(runCount));
      dispatch(changeResultPair(processedResult.viewValues));

      if (!result[0].success || !result[1].success) {
        dispatch(changeUncommitCount(0));
      } else {
        dispatch(changeUncommitCount(runCount));
      }

      if (
        processedResult.diffCount > 0 ||
        !result[0].success ||
        !result[1].success
      ) {
        dispatch(changeDiffRowCount(processedResult.diffCount));
        break;
      }

      oraParam = oraParamGen.next();
      pgParam = pgParamGen.next();
    }
    dispatch(changePanelExpand(true));
  } catch (e) {
  } finally {
    dispatch(changeIsRunning(false));
  }
};

const validateProps = async (oraProps: any, pgProps: any) => {
  const validateResult: any = {};
  if (!oraProps && !pgProps) {
    return validateResult;
  }

  const start = process.hrtime();

  for (const oraFilePath in oraProps) {
    const oraFileProps = oraProps[oraFilePath];
    const classPath = oraFilePath.replace(".oracle.properties", "");
    const pgFilePath = oraFilePath.replace("oracle", "pg");
    const pgFileProps = pgProps[pgFilePath];

    const classResult: any = {};
    validateResult[classPath] = classResult;

    await Promise.all(
      Object.keys(oraFileProps).map(async (propKey) => {
        const oraQuery = oraFileProps[propKey];
        const pgQuery = pgFileProps && pgFileProps[propKey];
        const query = {
          postgres: {
            dbType: DB_TYPE.POSTGRES,
            statement: pgQuery ? pgQuery : oraQuery,
            schema: "greenco",
          },
        };
        classResult[propKey] = await QueryRunner.validateQuery(
          query,
          "greenco"
        );
      })
    );
  }

  const end = process.hrtime(start);

  return validateResult;
};

export const searchProps = (filePath: string, className: string) => async (
  dispatch: Function
) => {
  try {
    let start = process.hrtime();
    const oracleProperties = await loadOracleProperties(filePath, className);
    const oracleEnd = process.hrtime(start);
    start = process.hrtime();
    const postgresProperties = await loadPostgresProperties(
      filePath,
      className
    );
    const postgresEnd = process.hrtime(start);

    const validateResults = await validateProps(
      oracleProperties,
      postgresProperties
    );

    dispatch(
      loadPropsFiles(oracleProperties, postgresProperties, validateResults)
    );
  } catch (e) {
    dispatch(showNotification(e.message, "error"));
  }
};

export const saveProp = (
  classPath: string,
  propKey: string,
  values: Array<string>,
  saveTarget: number
) => async (dispatch: Function) => {
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

export const evaluateParameters = async (
  parameters: Array<Array<Parameter>>,
  schema: string
) => {
  const oraPromise = parameters[0].map(async (p) => {
    if (p.evaluated.success && p.evaluated.value) {
      return p.evaluated;
    }
    return await evaluateOracle(p.raw, schema);
  });
  const oraRets = await Promise.all(oraPromise);
  const newOraParams = parameters[0].map((p, i) =>
    Object.assign({}, p, {
      evaluated: oraRets[i],
    })
  );

  const pgPromise = parameters[1].map(async (p) => {
    if (p.evaluated.success && p.evaluated.value) {
      return p.evaluated;
    }
    return await evaluatePostgres(p.raw, schema);
  });
  const pgRets = await Promise.all(pgPromise);
  const newPgParams = parameters[1].map((p, i) =>
    Object.assign({}, p, {
      evaluated: pgRets[i],
    })
  );

  return [newOraParams, newPgParams];
};

export const evaluateParameter = (
  parameters: Array<Array<Parameter>>,
  index: number,
  schema: string,
  mode: number
) => async (dispatch: Function) => {

  let oraParams = parameters[0];
  let pgParams = parameters[1];
  if (oraParams && index < oraParams.length && (mode === 0 || mode === 2)) {
    const param = oraParams[index];
    const oralceRet = await evaluateOracle(param.raw, schema);
    const updatedParam = Object.assign({}, param, {
      evaluated: oralceRet,
    });
    oraParams = updateArrayElement(oraParams, index, updatedParam);
  }

  if (pgParams && index < pgParams.length && (mode === 1 || mode === 2)) {
    const param = pgParams[index];
    const pgRet = await evaluatePostgres(param.raw, schema);
    const updatedParam = Object.assign({}, param, {
      evaluated: pgRet,
    });
    pgParams = updateArrayElement(pgParams, index, updatedParam);
  }
  dispatch(changeParameters([oraParams, pgParams]));
};

export const validateParameters = (
  parameters: Array<Array<Parameter>>,
  schema: string
) => async (dispatch: Function) => {
  const evaledParams = await evaluateParameters(parameters, schema);
  dispatch(changeParameters(evaledParams));
  const oraParamValid = evaledParams[0].reduce(
    (prev, p) =>
      prev && Array.isArray(p.evaluated.value) && p.evaluated.value.length,
    true
  );
  const pgParamValid = evaledParams[1].reduce(
    (prev, p) =>
      prev && Array.isArray(p.evaluated.value) && p.evaluated.value.length,
    true
  );

  return [oraParamValid, pgParamValid];
};

export const connectToOracle = (config: any, schema?: string) => async (
  dispatch: Function
) => {
  try {
    oracleClient.setConfig(config);
    await oracleClient.connectDatabase();
    dispatch(showNotification("Successfully connected to Oracle.", "success"));
  } catch (e) {
    dispatch(showNotification("Failed to connect to Oracle.", "error"));
  } finally {
    dispatch(changeIsRunning(false));
    dispatch(changeUncommitCount(0));
  }
};

export const connectToPostgres = (config: any, schema?: string) => async (
  dispatch: Function
) => {
  try {
    postgresClient.setConfig(config);
    await postgresClient.connectDatabase();
    dispatch(
      showNotification("Successfully connected to Postgres.", "success")
    );
  } catch (e) {
    dispatch(showNotification("Failed to connect to Postgres.", "error"));
  } finally {
    dispatch(changeIsRunning(false));
    dispatch(changeUncommitCount(0));
  }
};

export const initApp = createAction("initApp");
