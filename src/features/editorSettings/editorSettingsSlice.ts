import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initApp } from "../../actions";

export interface editorSettingsState {
  theme: string;
  fontSize: string;
}

const initialState: editorSettingsState = {
  theme: "tomorrow",
  fontSize: "15",
};

const editorSettingsSlice = createSlice({
  name: "editorSettings",
  initialState,
  reducers: {
    setTheme(state, { payload }: PayloadAction<string>) {
      state.theme = payload;
    },
    setFontSize(state, { payload }: PayloadAction<string>) {
      state.fontSize = payload;
    },
    changeSettings(state, { payload }: PayloadAction<any>) {
      Object.assign(state, payload);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initApp, (state) => {
      return Object.assign({}, initialState, state);
    });
  },
});

export const {
  changeSettings,
  setTheme,
  setFontSize,
} = editorSettingsSlice.actions;

export default editorSettingsSlice.reducer;
