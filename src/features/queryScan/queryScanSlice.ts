import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import queryRunner, {
  ParameterGenerateStrategy,
  ProgressMessage,
  Query,
  ScanResult,
  ScanSchemaResult
} from "../../apis/queryRunner";
import { DBType } from "../../apis/sqlCommon";
import { evaluateRawParamsPair } from "../../core/parameterEvaluator";
import {
  GetParamReturn,
  getParamsPair,
  saveParamsPair,
  StoredParams
} from "../../core/paramStore";
import { RootState } from "../../reducers";
import { getParameterMarkerPosition } from "../../util";
import {
  setSchemaResults,
  startNewResults,
  updateProgress,
  updateSchemaResult
} from "../runnerResult/runnerResultSlice";
import { changeUncommitCount } from "../transactionControl/transactionControlSlice";

export enum ParameterStatus {
  Active = "active",
  Valid = "valid",
  Error = "error"
}

type EvaluatedParams =
  | {
      success: true;
      value: Array<any>;
    }
  | { success: false; errorMessage: string };

export interface ParameterValue {
  raw: string;
  evaluated?: EvaluatedParams;
  status?: ParameterStatus;
}

export interface Parameter extends ParameterValue {
  row: number;
  col: number;
}

interface QueryScanState {
  cartesian: boolean;
  openModel: boolean;
  selectedSchemas: string[];
  activeSchema: string;
  statements: [string, string];
  sync: boolean;
  parametersPair: [Parameter[], Parameter[]];
}

const initialState: QueryScanState = {
  cartesian: false,
  openModel: false,
  activeSchema: "",
  sync: false,
  selectedSchemas: [],
  statements: ["", ""],
  parametersPair: [[], []]
};

export const loadQueryScan = createAsyncThunk<
  void,
  [string, string],
  { state: RootState }
>("queryScan/loadQueryScan", async (stmtPair, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const {
    navigator: { activeView },
    propsEditor: { selectedClassName, selectedPropName }
  } = getState();

  let storedParamsPair: GetParamReturn | null;

  console.log('1')

  if (activeView === 0) {
    storedParamsPair = await getParamsPair({
      propPath: selectedClassName,
      propName: selectedPropName,
      stmts: stmtPair
    });
  } else if (activeView === 1) {
    storedParamsPair = await getParamsPair({
      stmts: stmtPair
    });
  }

  console.log('2')

  const paramsPair = stmtPair
    .map(getParameterMarkerPosition)
    .map((paramsPos, pairIndex) => {
      let storedValue: StoredParams | undefined;
      if (storedParamsPair != null) {
        const fromPropsList = storedParamsPair.fromProps?.[pairIndex];
        const fromProps = fromPropsList?.[fromPropsList.length - 1];
        const fromStmtList = storedParamsPair.fromStmts?.[pairIndex];
        const fromStmt = fromStmtList?.[fromStmtList.length - 1];

        storedValue = fromProps;
        if (
          storedValue == null ||
          (fromStmt != null && fromStmt.timestamp > storedValue.timestamp)
        ) {
          storedValue = fromStmt;
        }
      }

      return paramsPos.map((paramPos, paramIndex) => {
        let raw = storedValue?.value[paramIndex] || "";
        return { ...paramPos, raw, evaluated: {} };
      });
    }) as [Parameter[], Parameter[]];

  dispatch(initQueryScan({ stmtPair, paramsPair }));
});

export const startQueryScan = createAsyncThunk<
  ScanResult,
  void,
  { state: RootState }
>("queryScan/queryScanStatus", async (arg, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const {
    queryScan: { parametersPair, selectedSchemas, statements },
    navigator: { activeView },
    propsEditor: { selectedClassName, selectedPropName }
  } = getState();

  const unEvaled = parametersPair.map((params) =>
    params.map((param) => ({
      row: param.row,
      col: param.col,
      raw: param.raw
    }))
  );

  // Save parmas to database
  if (activeView === 0) {
    await saveParamsPair({
      propPath: selectedClassName,
      propName: selectedPropName,
      stmts: statements,
      paramsPair: parametersPair
    });
  } else if (activeView === 1) {
    await saveParamsPair({
      stmts: statements,
      paramsPair: parametersPair
    });
  }

  const schemaQueriesMap: { [name: string]: Query[] } = {};

  for (let schema of selectedSchemas) {
    const evaluatedParamsPair = await evaluateRawParamsPair(unEvaled, schema);
    const paramsPair = evaluatedParamsPair.map((params: Parameter[]) =>
      params.map((param) => {
        if (param.evaluated?.success) {
          return param.evaluated.value;
        }
        return [];
      })
    );
    const queries = statements.map((stmt, index) => {
      const dbType: DBType = index === 0 ? DBType.Oracle : DBType.Postgres;
      const params = paramsPair[index];
      const query: Query = {
        dbType,
        parameters: params,
        statement: stmt,
        mode: ParameterGenerateStrategy.Normal
      };

      return query;
    });

    schemaQueriesMap[schema] = queries;
  }
  dispatch(setOpenModal(false));
  dispatch(startNewResults(selectedSchemas));

  const handleUpdateProgress = (progress: ProgressMessage): void => {
    dispatch(updateProgress(progress));
  };
  const handleUpdateSchemaResult = (
    schemaResult: [string, ScanSchemaResult]
  ): void => {
    dispatch(updateSchemaResult(schemaResult));
  };

  try {
    queryRunner.addProgressListener(handleUpdateProgress);
    queryRunner.addSchemaResultListener(handleUpdateSchemaResult);
    const scanResults = await queryRunner.scanQueries(schemaQueriesMap, true);
    dispatch(setSchemaResults(scanResults));
    // const [
    //   oracleUncommit,
    //   postgresUncommit
    // ] = await queryRunner.getTransactionStatus();
    dispatch(changeUncommitCount(1));
    return scanResults;
  } finally {
    queryRunner.removeSchemaResultListener(handleUpdateSchemaResult);
    queryRunner.removeProgressListener(handleUpdateProgress);
  }
});

const queryScan = createSlice({
  name: "queryScan",
  initialState,
  reducers: {
    setOpenModal(state, { payload }: PayloadAction<boolean>) {
      state.openModel = payload;
    },
    setSelectedSchemas(state, { payload }: PayloadAction<string[]>) {
      state.selectedSchemas = payload;
    },
    setActiveSchema(state, { payload }: PayloadAction<string>) {
      state.activeSchema = payload;
    },
    setParametersPair(
      state,
      { payload }: PayloadAction<[Parameter[], Parameter[]]>
    ) {
      state.parametersPair = payload;
    },
    initQueryScan(
      state,
      {
        payload
      }: PayloadAction<{
        stmtPair: [string, string];
        paramsPair: [Parameter[], Parameter[]];
      }>
    ) {
      const { stmtPair, paramsPair } = payload;
      state.statements = stmtPair;
      state.parametersPair = paramsPair;

      state.sync =
        state.parametersPair[0].length === state.parametersPair[1].length &&
        Array(state.parametersPair[0].length).filter(
          (_, index) =>
            state.parametersPair[0][index].raw !==
            state.parametersPair[1][index].raw
        ).length === 0;

      state.cartesian = false;
      state.openModel = true;
    }
  }
});

export const {
  initQueryScan,
  setActiveSchema,
  setOpenModal,
  setParametersPair,
  setSelectedSchemas
} = queryScan.actions;

export default queryScan.reducer;
