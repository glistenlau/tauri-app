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
import { RootState } from "../../reducers";
import { getParameterMarkerPosition } from "../../util";
import { changeIsRunning } from "../runnerControl/runnerControlSlice";
import {
  setSchemaResults,
  startNewResults,
  updateProgress,
  updateSchemaResult
} from "../runnerResult/runnerResultSlice";

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

export const startQueryScan = createAsyncThunk<
  ScanResult,
  void,
  { state: RootState }
>("queryScan/queryScanStatus", async (arg, thunkApi) => {
  const { dispatch, getState } = thunkApi;
  const {
    queryScan: { parametersPair, selectedSchemas, statements }
  } = getState();

  const unEvaled = parametersPair.map((params) =>
    params.map((param) => ({
      row: param.row,
      col: param.col,
      raw: param.raw
    }))
  );
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
  console.log("schema query map", schemaQueriesMap);
  dispatch(setOpenModal(false));
  dispatch(changeIsRunning(true));
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
    return scanResults;
  } finally {
    dispatch(changeIsRunning(false));
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
    initQueryScan(state, { payload }: PayloadAction<[string, string]>) {
      state.statements = payload;
      state.parametersPair = payload
        .map(getParameterMarkerPosition)
        .map((paramsPos) =>
          paramsPos.map((paramPos) => ({ ...paramPos, raw: "", evaluated: {} }))
        ) as [Parameter[], Parameter[]];

      state.sync =
        state.parametersPair[0].length === state.parametersPair[1].length &&
        Array(state.parametersPair[0].length).filter(
          (_, index) =>
            state.parametersPair[0][index].raw !==
            state.parametersPair[1][index].raw
        ).length === 0;

      state.cartesian = false;
      state.openModel = true;
    },
    startScan(state) {}
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
