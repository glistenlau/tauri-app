import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { initApp } from "../../actions";
import oracle from "../../apis/oracle";
import postgres from "../../apis/postgres";

export interface settingsState {
    oracleSettings: OracleSettings;
    postgreSettings: PostgreSettings;
}

export interface OracleSettings {
    host: string;
    port: string;
    sid: string;
    user: string;
    password: string;
}

const DEFAULT_ORACLE_SETTINGS = {
    host: "localhost",
    port: "1521",
    sid: "anaconda",
    user: "anaconda",
    password: "anaconda",
};

export interface PostgreSettings {
    host: string;
    port: string;
    dbname: string;
    user: string;
    password: string;
}

const DEFAULT_POSTGRE_SETTINGS = {
    host: "localhost",
    port: "5432",
    dbname: "planning",
    user: "postgres",
    password: "#postgres#",
};

const initialState: settingsState = {
    oracleSettings: DEFAULT_ORACLE_SETTINGS,
    postgreSettings: DEFAULT_POSTGRE_SETTINGS,
};

export const isOracleSettings = (
    config: OracleSettings | PostgreSettings
): config is OracleSettings => {
    return (config as OracleSettings).sid !== undefined;
};

export const updateOracleConfig = createAsyncThunk(
    "settings/updateOracleConfig",
    async ({ config }: { config: OracleSettings }) => {
        const res = await oracle.setConfig(config);
        return res;
    }
);

export const updatePostgresConfig = createAsyncThunk(
    "settings/updatePostgresConfig",
    async ({ config }: { config: PostgreSettings }) => {
        const res = await postgres.setConfig(config);
        return res;
    }
);

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setOracleConfig: (
            state: settingsState,
            { payload }: PayloadAction<OracleSettings>
        ) => {
            state.oracleSettings = payload;
        },
        setPostgresConfig: (
            state: settingsState,
            { payload }: PayloadAction<PostgreSettings>
        ) => {
            state.postgreSettings = payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initApp, (state) => {
            return Object.assign({}, initialState, state);
        });
    },
});

export const { setOracleConfig, setPostgresConfig } = settingsSlice.actions;

export default settingsSlice.reducer;
