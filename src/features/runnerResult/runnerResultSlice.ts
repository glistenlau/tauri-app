import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
  resultPair: [DiffResultType, DiffResultType];
}

const initialState: RunnerResultState = {
  currentParametersPair: [[], []],
  diffRowCount: 0,
  panelExpand: false,
  panelHeight: 200,
  processedCount: 0,
  processedRowCount: 0,
  totalCount: 0,
  timeElapsedPair: [
    [0, 0],
    [0, 0],
  ],
  resultPair: [null, null],
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
} = runnerResult.actions;

export default runnerResult.reducer;
