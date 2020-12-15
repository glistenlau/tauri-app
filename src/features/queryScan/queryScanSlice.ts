import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getParameterMarkerPosition } from "../../util";

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
    setSelectedSchemas(state, { payload }: PayloadAction<string[]>) {
      state.selectedSchemas = payload;
    },
    setActiveSchema(state, { payload }: PayloadAction<string>) {
      state.activeSchema = payload;
    },
    initQueryScan(state, { payload }: PayloadAction<[string, string]>) {
      state.statements = payload;
      state.parameters = payload
        .map(getParameterMarkerPosition)
        .map((paramsPos) =>
          paramsPos.map((paramPos) => ({ ...paramPos, raw: "", evaluated: {} }))
        ) as [Parameter[], Parameter[]];
      state.sync = state.parameters[0].length === state.parameters[1].length 
        && Array(state.parameters[0].length)
        .filter((_, index) => state.parameters[0][index].raw !== state.parameters[1][index].raw).length === 0;
      state.cartesian = false;
      state.openModel = true;
    },
    startScan(state) {

    },
  },
});

export const {
  initQueryScan,
  setActiveSchema,
  setOpenModal,
  setSelectedSchemas,
} = queryScan.actions;

export default queryScan.reducer;
