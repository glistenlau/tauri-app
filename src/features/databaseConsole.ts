import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConsoleValuePair = [string, string];

interface DatabaseConsoleState {
  consoleValuePair: ConsoleValuePair;
}

const initialState: DatabaseConsoleState = {
  consoleValuePair: ["", ""],
};

const databaseConsole = createSlice({
  name: "databaseConsole",
  initialState,
  reducers: {
    changeConsleValuePair(state, { payload }: PayloadAction<ConsoleValuePair>) {
      state.consoleValuePair = payload;
    },
  },
});

export const { changeConsleValuePair } = databaseConsole.actions;

export default databaseConsole.reducer;
