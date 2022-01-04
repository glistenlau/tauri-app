import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initApp } from "../../actions";

export interface PropName {
  name: string;
  oracle: boolean;
  postgres: boolean;
}

export interface propsSearchState {
  activePair: [boolean, boolean];
  searchFilePath: string;
  searchClassName: string;
  selectedClassName: string;
  selectedPropName: string;
  classNameList: Array<string>;
  listSelectedClassName: string;
  propNameList: Array<PropName>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  panelWidth: number;
  valuePair: [string, string];
  diffMode: boolean;
}

const initialState: propsSearchState = {
  activePair: [true, true],
  status: "idle",
  error: null,
  searchFilePath: "",
  searchClassName: "",
  selectedClassName: "",
  selectedPropName: "",
  listSelectedClassName: "",
  classNameList: [],
  propNameList: [],
  panelWidth: 200,
  valuePair: ["", ""],
  diffMode: false,
};

const propsEditorSlice = createSlice({
  name: "propsEditor",
  initialState,
  reducers: {
    setFilePath(state, { payload }: PayloadAction<string>) {
      state.searchFilePath = payload;
    },
    setClassName(state, { payload }: PayloadAction<string>) {
      state.searchClassName = payload;
    },
    setWidth(state, { payload }: PayloadAction<number>) {
      state.panelWidth = payload;
    },
    setActivePair(state, { payload }: PayloadAction<[boolean, boolean]>) {
      state.activePair = payload;
    },
    setDiffMode(state, { payload }: PayloadAction<boolean>) {
      state.diffMode = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initApp, (state) => {
      return Object.assign({}, initialState, state);
    });
  },
});

export const {
  setActivePair,
  setDiffMode,
  setFilePath,
  setClassName,
  setWidth,
} = propsEditorSlice.actions;

export default propsEditorSlice.reducer;
