import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getParameterMarkerPosition } from "../../util";

export enum ParameterStatus {
  Active = "active",
  Valid = "valid",
  Error = "error",
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
  parametersPair: [[], []],
};

const queryScan = createSlice({
  name: "runnerControl",
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
    setParametersPair(state, {payload}: PayloadAction<[Parameter[], Parameter[]]>) {
      state.parametersPair = payload;
    },
    initQueryScan(state, { payload }: PayloadAction<[string, string]>) {
      state.statements = payload;
      state.parametersPair = payload
        .map(getParameterMarkerPosition)
        .map((paramsPos) =>
          paramsPos.map((paramPos) => ({ ...paramPos, raw: "", evaluated: {} }))
        ) as [Parameter[], Parameter[]];

      state.sync = state.parametersPair[0].length === state.parametersPair[1].length
        && Array(state.parametersPair[0].length)
        .filter((_, index) => state.parametersPair[0][index].raw !== state.parametersPair[1][index].raw).length === 0;

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
  setParametersPair,
  setSelectedSchemas,
} = queryScan.actions;

export default queryScan.reducer;
