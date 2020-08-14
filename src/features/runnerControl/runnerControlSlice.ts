import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RunnerControlState {
  schema: string;
  sortResults: boolean;
  isRunning: boolean;
}

const initialState: RunnerControlState = {
  schema: "greenco",
  sortResults: false,
  isRunning: false,
};

const runnerControl = createSlice({
  name: "runnerContorl",
  initialState,
  reducers: {
    changeSchema(state, { payload }: PayloadAction<string>) {
      state.schema = payload;
    },
    changeIsRunning(state, { payload }: PayloadAction<boolean>) {
      state.isRunning = payload;
    },
    changeSortResults(state, { payload }: PayloadAction<boolean>) {
      state.sortResults = payload;
    },
  },
});

export const {
  changeSchema,
  changeIsRunning,
  changeSortResults,
} = runnerControl.actions;

export default runnerControl.reducer;
