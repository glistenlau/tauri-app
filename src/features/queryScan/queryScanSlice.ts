import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum ParameterStatus {
  Active = "active",
  Valid = "valid",
  Error = "error",
}

type EvalatedParams =
  | {
      success: true;
      value: Array<any>;
    }
  | { success: false; errorMessage: string };

export interface Parameter {
  raw: string;
  evaluated: EvalatedParams;
  status?: ParameterStatus;
  row: number;
  col: number;
}

interface QueryScanState {
  cartesian: boolean;
  openModel: boolean;
  schemas: string[];
  statements: [string, string];
  sync: boolean;
  parameters: [Parameter[], Parameter[]];
}

const initialState: QueryScanState = {
  cartesian: false,
  openModel: false,
  sync: false,
  schemas: [],
  statements: ["", ""],
  parameters: [[], []],
};

const queryScan = createSlice({
  name: "runnerContorl",
  initialState,
  reducers: {
    setOpenModal(state, { payload }: PayloadAction<boolean>) {
      state.openModel = payload;
    },
  },
});

export const { setOpenModal } = queryScan.actions;

export default queryScan.reducer;
