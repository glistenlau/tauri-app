// @ts-ignore
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initApp } from "../../actions";
import { DbSchemaSearchFlatQuery } from "../../generated/graphql";

export interface SchemaEditorState {
  activePair: [boolean, boolean];
  valuePair: [string, string];
  leftPanelWidth: number;
  flatTreeData?: DbSchemaSearchFlatQuery;
  searchPath: string;
  searchFile: string;
  activeNodeId: string;
  diffMode: boolean;
  filterText: string;
  pathOpenMap: any;
}

const initialState: SchemaEditorState = {
  activePair: [true, true],
  leftPanelWidth: 200,
  valuePair: ["", ""],
  flatTreeData: undefined,
  searchPath: "",
  searchFile: "",
  activeNodeId: "",
  diffMode: false,
  filterText: "",
  pathOpenMap: {},
};

const schemaEditor = createSlice({
  name: "schemaEditor",
  initialState,
  reducers: {
    changeLeftPanelWidth(state, { payload }: PayloadAction<number>) {
      state.leftPanelWidth = payload;
    },
    changeValuePair(state, { payload }: PayloadAction<[string, string]>) {
      state.valuePair = payload;
    },
    changeSearchPath(state, { payload }: PayloadAction<string>) {
      state.searchPath = payload;
    },
    changeSearchFile(state, { payload }: PayloadAction<string>) {
      state.searchFile = payload;
    },
    changeFilterText(state, { payload }: PayloadAction<string>) {
      state.filterText = payload;
    },
    setActiveNodeId(state, { payload }: PayloadAction<string>) {
      state.activeNodeId = payload;
    },
    loadXmlList(
      state,
      { payload }: PayloadAction<DbSchemaSearchFlatQuery | undefined>
    ) {
      state.activeNodeId = initialState.activeNodeId;
      state.pathOpenMap = {};
      state.flatTreeData = payload;
      state.valuePair = initialState.valuePair;
    },
    toggleDiffMode(state) {
      state.diffMode = !state.diffMode;
    },
    toggleOpen(state, { payload }: PayloadAction<string>) {
      const wasOpen = state.pathOpenMap[payload] || false;
      state.pathOpenMap = Object.assign({}, state.pathOpenMap, {
        [payload]: !wasOpen,
      });
    },
    toggleActiveEditor(state, { payload }: PayloadAction<number>) {
      const newPair = [...state.activePair];
      newPair[payload] = !newPair[payload];
      state.activePair = [newPair[0], newPair[1]];
    },
    setActivePair(state, { payload }: PayloadAction<[boolean, boolean]>) {
      state.activePair = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initApp, (state) => {
      return Object.assign({}, initialState, state);
    });
  },
});

export const {
  changeFilterText,
  changeLeftPanelWidth,
  changeValuePair,
  loadXmlList,
  changeSearchPath,
  changeSearchFile,
  setActivePair,
  setActiveNodeId,
  toggleDiffMode,
  toggleOpen,
  toggleActiveEditor,
} = schemaEditor.actions;

export default schemaEditor.reducer;
