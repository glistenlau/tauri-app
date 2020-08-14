import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export enum TransactionMode {
  Auto = "Auto",
  Manual = "Manual",
}

export interface TransactionControlState {
  transactionMode: TransactionMode;
  uncommitCount: number;
}

const initialState: TransactionControlState = {
  transactionMode: TransactionMode.Manual,
  uncommitCount: 0,
};

const transactionControl = createSlice({
  name: "transactionControl",
  initialState,
  reducers: {
    changeTransactionMode(state, { payload }: PayloadAction<TransactionMode>) {
      state.transactionMode = payload;
    },
    changeUncommitCount(state, { payload }: PayloadAction<number>) {
      state.uncommitCount = payload;
    },
  },
});

export const {
  changeTransactionMode,
  changeUncommitCount,
} = transactionControl.actions;

export default transactionControl.reducer;
