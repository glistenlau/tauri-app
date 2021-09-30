import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initApp } from "../../actions";
import JavaPropsApi, {
  FilePropsMap,
  FilePropsValidMap,
  JavaPropsResponse,
} from "../../apis/javaProps";

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
  propsMap: FilePropsMap;
  propsValidateMap: FilePropsValidMap;
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
  propsMap: {},
  propsValidateMap: {},
  panelWidth: 200,
  valuePair: ["", ""],
  diffMode: false,
};

export const searchProps = createAsyncThunk(
  "propsSearch/searchProps",
  async ({ filePath, className }: { filePath: string; className: string }) => {
    const res = await JavaPropsApi.search(filePath, className);
    return res;
  }
);

const selectClassName = (
  state: propsSearchState,
  selectedClassName: string
) => {
  if (!(selectedClassName in state.propsMap)) {
    return;
  }

  state.listSelectedClassName = selectedClassName;

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
  const selectedPropsMap = state.propsMap[state.listSelectedClassName];
  if (!selectedPropsMap) {
    return;
  }
  const valuePair = selectedPropsMap[selectPropName];
  if (!valuePair) {
    return;
  }

  state.selectedClassName = state.listSelectedClassName;
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
    setActivePair(state, { payload }: PayloadAction<[boolean, boolean]>) {
      state.activePair = payload;
    },
    setDiffMode(state, { payload }: PayloadAction<boolean>) {
      state.diffMode = payload;
    },
    setPropName(state, { payload }: PayloadAction<string>) {
      selectPropName(state, payload);
    },
    setClassPath(state, { payload }: PayloadAction<string>) {
      selectClassName(state, payload);
    },
    updateParamValuePair(state, { payload }: PayloadAction<[string, string]>) {
      const { propsMap, selectedClassName, selectedPropName } = state;
      let propsList = propsMap[selectedClassName] ?? {};
      if (propsList[selectedPropName]) {
        propsList = Object.assign({}, propsList, {
          [selectedPropName]: payload,
        });
        state.propsMap = Object.assign({}, propsMap, {
          [selectedClassName]: propsList,
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initApp, (state) => {
      return Object.assign({}, initialState, state);
    });
    builder.addCase(searchProps.pending, (state, action) => {
      state.status = "loading";
    });
    builder.addCase(searchProps.fulfilled, (state, action) => {
      const propsMap: JavaPropsResponse = action.payload;

      state.status = "succeeded";
      state.propsMap = propsMap.file_props_map;
      state.propsValidateMap = propsMap.file_props_valid_map;
      state.classNameList = Object.keys(state.propsMap).sort();

      if (state.classNameList.length === 0) {
        return;
      }

      let classNameToSelect = state.classNameList[0];
      if (state.classNameList.indexOf(state.selectedClassName) !== -1) {
        classNameToSelect = state.selectedClassName;
      }

      selectClassName(state, classNameToSelect);
    });
  },
});

export const {
  setActivePair,
  setDiffMode,
  setFilePath,
  setClassName,
  setWidth,
  setPropName,
  setClassPath,
  updateParamValuePair,
} = propsEditorSlice.actions;

export default propsEditorSlice.reducer;
