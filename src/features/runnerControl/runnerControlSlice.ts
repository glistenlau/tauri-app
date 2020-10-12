import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface RunnerControlState {
  schema: string;
  schemas: [string[], string[]];
  sortResults: boolean;
  isRunning: boolean;
}

const initialState: RunnerControlState = {
  schema: "greenco",
  schemas: [[], []],
  sortResults: false,
  isRunning: false,
};

const runnerControl = createSlice({
  name: "runnerContorl",
  initialState,
  reducers: {
    setSchemas(state, { payload }: PayloadAction<[string[], string[]]>) {
      if (!payload) {
        return;
      }
      state.schemas = payload;
    },
    changeSchema(state, { payload }: PayloadAction<string>) {
      if (
        !payload ||
        (state.schemas[0].indexOf(payload) === -1 &&
          state.schemas[1].indexOf(payload) === -1)
      ) {
        if (
          state.schemas[0].indexOf(state.schema) !== -1 ||
          state.schemas[1].indexOf(state.schema) !== -1
        ) {
          return;
        }
        if (state.schemas[0].length > 0) {
          state.schema = state.schemas[0][0];
        } else if (state.schemas[1].length > 0) {
          state.schema = state.schemas[1][0];
        }
        state.schema = "";
        return;
      }

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
  setSchemas,
} = runnerControl.actions;

export default runnerControl.reducer;
