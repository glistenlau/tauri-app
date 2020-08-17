import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { initApp } from "../../actions";
import JavaPropsApi from "../../apis/javaProps";

export interface PropsMap {
  [filePath: string]: {
    [propKey: string]: [string | null, string | null];
  };
}

export interface PropName {
  name: string;
  oracle: boolean;
  postgres: boolean;
}

export interface propsSearchState {
  searchFilePath: string;
  searchClassName: string;
  selectedClassName: string;
  selectedPropName: string;
  classNameList: Array<string>;
  propNameList: Array<PropName>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  propsMap: PropsMap;
  panelWidth: number;
  valuePair: [string, string];
  diffMode: boolean;
}

const initialState: propsSearchState = {
  status: "idle",
  error: null,
  searchFilePath: "",
  searchClassName: "",
  selectedClassName: "",
  selectedPropName: "",
  classNameList: [],
  propNameList: [],
  propsMap: {},
  panelWidth: 200,
  valuePair: ["", ""],
  diffMode: false,
};

export const searchProps = createAsyncThunk(
  "propsSearch/searchProps",
  async ({ filePath, className }: { filePath: string; className: string }) => {
    return await JavaPropsApi.search(filePath, className);
  }
);

const selectClassName = (
  state: propsSearchState,
  selectedClassName: string
) => {
  if (!(selectedClassName in state.propsMap)) {
    return;
  }

  state.selectedClassName = selectedClassName;

  state.propNameList = Object.entries(state.propsMap[selectedClassName])
    .filter(([key, valuePair]) => !key.toLowerCase().trim().endsWith("md5"))
    .map(([key, valuePair]) => ({
      name: key,
      oracle: valuePair[0] != null,
      postgres: valuePair[1] != null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const selectPropName = (state: propsSearchState, selectPropName: string) => {
  console.log(state, selectPropName);
  const selectedPropsMap = state.propsMap[state.selectedClassName];
  if (!selectedPropsMap) {
    return;
  }
  const valuePair = selectedPropsMap[selectPropName];
  if (!valuePair) {
    return;
  }

  state.selectedPropName = selectPropName;
  updateValuePair(state, valuePair);
};

const updateValuePair = (
  state: propsSearchState,
  valuePair: [string | null, string | null]
) => {
  state.valuePair = [valuePair[0] ?? "", valuePair[1] ?? ""];
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
    setPropName(state, { payload }: PayloadAction<string>) {
      selectPropName(state, payload);
    },
    setClassPath(state, { payload }: PayloadAction<string>) {
      selectClassName(state, payload);
    },
    setValuePair(state, { payload }: PayloadAction<[string, string]>) {
      updateValuePair(state, payload);
    },
  },
  extraReducers: {
    [initApp]: (state) => {
      return Object.assign({}, initialState, state);
    },
    [searchProps.pending]: (state, action) => {
      state.status = "loading";
    },
    [searchProps.fulfilled]: (state, action) => {
      const propsMap: PropsMap = action.payload;

      state.status = "succeeded";
      state.propsMap = propsMap;
      state.classNameList = Object.keys(propsMap).sort();

      if (state.classNameList.length === 0) {
        return;
      }

      selectClassName(state, state.classNameList[0]);
    },
  },
});

export const {
  setFilePath,
  setClassName,
  setWidth,
  setPropName,
  setClassPath,
  setValuePair,
} = propsEditorSlice.actions;

export default propsEditorSlice.reducer;
