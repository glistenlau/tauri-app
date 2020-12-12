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
  selectedSchemas: string[];
  activeSchema: string;
  statements: [string, string];
  sync: boolean;
  parameters: [Parameter[], Parameter[]];
}

const initialState: QueryScanState = {
  cartesian: false,
  openModel: false,
  activeSchema: "",
  sync: false,
  selectedSchemas: [],
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
    setSelectedSchemas(state, {payload}: PayloadAction<string[]>) {
      state.selectedSchemas = payload;
    },
    setActiveSchema(state, {payload}: PayloadAction<string>) {
      state.activeSchema = payload;
    }
  },
});

export const { setActiveSchema, setOpenModal, setSelectedSchemas } = queryScan.actions;

export default queryScan.reducer;
