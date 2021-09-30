import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ProgressMessage,
  ScanProcess,
  ScanResult,
  ScanSchemaResult,
} from "../../apis/queryRunner";
import { DiffResultType } from "../../core/dbResultDiff";

export type TimeElapsed = [number, number];
export type TimeElapsedPair = [TimeElapsed, TimeElapsed];
export type ParametersPair = [Array<any>, Array<any>];

export interface RunnerResultState {
  currentParametersPair: ParametersPair;
  diffRowCount: number;
  panelExpand: boolean;
  panelHeight: number;
  processedCount: number;
  processedRowCount: number;
  totalCount: number;
  timeElapsedPair: TimeElapsedPair;
  resultPair: [DiffResultType | null, DiffResultType | null];
  schemaResults: ScanResult;
  schemaProgress: { [schema: string]: [ScanProcess, ScanProcess] };
  selectedSchema: string;
  resultActivePair: [boolean, boolean];
}

export const initialState: RunnerResultState = {
  currentParametersPair: [[], []],
  diffRowCount: 0,
  panelExpand: false,
  panelHeight: 200,
  processedCount: 0,
  processedRowCount: 0,
  schemaProgress: {},
  schemaResults: {},
  selectedSchema: "",
  totalCount: 0,
  timeElapsedPair: [
    [0, 0],
    [0, 0],
  ],
  resultPair: [null, null],
  resultActivePair: [true, true],
};

const runnerResult = createSlice({
  name: "runnerResult",
  initialState,
  reducers: {
    changeCurrentParametersPair(
      state,
      { payload }: PayloadAction<ParametersPair>
    ) {
      state.currentParametersPair = payload;
    },
    changeDiffRowCount(state, { payload }: PayloadAction<number>) {
      state.diffRowCount = payload;
    },
    changePanelExpand(state, { payload }: PayloadAction<boolean>) {
      state.panelExpand = payload;
    },
    changePanelHeight(state, { payload }: PayloadAction<number>) {
      state.panelHeight = payload;
    },
    changeProcessedCount(state, { payload }: PayloadAction<number>) {
      state.processedCount = payload;
    },
    changeProcessedRowCount(state, { payload }: PayloadAction<number>) {
      state.processedRowCount = payload;
    },
    changeResultPair(
      state,
      { payload }: PayloadAction<[DiffResultType, DiffResultType]>
    ) {
      state.resultPair = payload;
    },
    changeTotalCount(state, { payload }: PayloadAction<number>) {
      state.totalCount = payload;
    },
    changeTimeElapsedPair(state, { payload }: PayloadAction<TimeElapsedPair>) {
      state.timeElapsedPair = payload;
    },
    startNewResults(state, { payload }: PayloadAction<string[]>) {
      if (payload.length === 0) {
        return;
      }

      const progressMap: { [schema: string]: [ScanProcess, ScanProcess] } = {};
      payload.forEach(
        (schema) =>
          (progressMap[schema] = [
            { total: 0, pending: 0, finished: 0, parameters: null },
            { total: 0, pending: 0, finished: 0, parameters: null },
          ])
      );
      state.schemaProgress = progressMap;
      state.schemaResults = {};
      state.selectedSchema = payload[0];
    },
    updateProgress(state, { payload }: PayloadAction<ProgressMessage>) {
      const oldProgress = state.schemaProgress[payload.schema];
      if (!oldProgress) {
        return;
      }

      const newProgress = {
        total: payload.total,
        pending: payload.pending,
        finished: payload.finished,
        parameters: payload.parameters,
      };
      const newProgressPair = [...oldProgress];
      newProgressPair[payload.index] = newProgress;
      state.schemaProgress = Object.assign({}, state.schemaProgress, {
        [payload.schema]: newProgressPair,
      });
    },
    setSchemaResults(state, { payload }: PayloadAction<ScanResult>) {
      state.schemaResults = payload;
    },
    updateSchemaResult(
      state,
      { payload }: PayloadAction<[string, ScanSchemaResult]>
    ) {
      const [schema, schemaResult] = payload;
      state.schemaResults = Object.assign({}, state.schemaResults, {
        [schema]: schemaResult,
      });
    },
    setSelectedSchema(state, { payload }: PayloadAction<string>) {
      state.selectedSchema = payload;
    },
    setResultActivePair(state, { payload }: PayloadAction<[boolean, boolean]>) {
      state.resultActivePair = payload;
    },
  },
});

export const {
  changeCurrentParametersPair,
  changeDiffRowCount,
  changePanelExpand,
  changePanelHeight,
  changeProcessedCount,
  changeProcessedRowCount,
  changeResultPair,
  changeTotalCount,
  changeTimeElapsedPair,
  setResultActivePair,
  setSelectedSchema,
  setSchemaResults,
  startNewResults,
  updateProgress,
  updateSchemaResult,
} = runnerResult.actions;

export default runnerResult.reducer;
