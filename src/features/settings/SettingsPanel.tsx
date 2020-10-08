import { useSnackbar } from "notistack";
import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import oracle, { Oracle } from "../../apis/oracle";
import postgres, { Postgres } from "../../apis/postgres";
import SqlCommon from "../../apis/sqlCommon";
import Settings from "../../components/Settings";
import { RootState } from "../../reducers";
import {
    OracleSettings, PostgreSettings,

    setOracleConfig,
    setPostgresConfig
} from "./settingsSlice";


const SettingsPanel = React.memo(({ active }: any) => {
    const snackBar = useSnackbar();
    const oracleSettings = useSelector(
        (state: RootState) => state.settings.oracleSettings
    );
    const postgreSettings = useSelector(
        (state: RootState) => state.settings.postgreSettings
    );
    const dispatch = useDispatch();

    const updateDBConfig = useCallback(
        async <C, T extends SqlCommon<C>>(config: C, api: T, dbName: string) => {
            try {
                console.log(await api.setConfig(config));
                snackBar.enqueueSnackbar(`Successfully connected to the ${dbName}.`, {variant: 'success'});
            } catch (e) {
                snackBar.enqueueSnackbar(`Failed to connect to ${dbName}: ${e}`, {variant: 'error'});
            }
        },
        [snackBar]
    );

    useEffect(() => {
        updateDBConfig<OracleSettings, Oracle>(oracleSettings, oracle, "Oracle");
    }, [oracleSettings, updateDBConfig])

    useEffect(() => {
        updateDBConfig<PostgreSettings, Postgres>(postgreSettings, postgres, "Postgres");    
    }, [postgreSettings, updateDBConfig])

    const handleOracleConfigChange = useCallback(
        (config: OracleSettings) => {
            dispatch(setOracleConfig(config));
        },
        [dispatch]
    );

    const handlePostgresConfigChange = useCallback(
        (config: PostgreSettings) => {
            dispatch(setPostgresConfig(config));
        },
        [dispatch]
    );

    return (
        <Settings
            active={active}
            oracleSettings={oracleSettings}
            postgreSettings={postgreSettings}
            onOracleConfigChange={handleOracleConfigChange}
            onPostgresConfigChange={handlePostgresConfigChange}
        />
    );
});

export default SettingsPanel;
