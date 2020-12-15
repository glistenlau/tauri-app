import { useSnackbar } from "notistack";
import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import oracle, { Oracle } from "../../apis/oracle";
import postgres, { Postgres } from "../../apis/postgres";
import SqlCommon from "../../apis/sqlCommon";
import Settings from "../../components/Settings";
import TabContent from "../../components/TabContent";
import { RootState } from "../../reducers";
import {
  OracleSettings,
  PostgreSettings,
  setOracleConfig,
  setPostgresConfig,
} from "./settingsSlice";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: column;
`;

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
      console.log("update db config...", config);
      try {
        console.log(await api.setConfig(config));
        snackBar.enqueueSnackbar(`Successfully connected to the ${dbName}.`, {
          variant: "success",
        });
      } catch (e) {
        snackBar.enqueueSnackbar(`Failed to connect to ${dbName}: ${e}`, {
          variant: "error",
        });
      }
    },
    [snackBar]
  );

  useEffect(() => {
    updateDBConfig<OracleSettings, Oracle>(oracleSettings, oracle, "Oracle");
  }, [oracleSettings, updateDBConfig]);

  useEffect(() => {
    updateDBConfig<PostgreSettings, Postgres>(
      postgreSettings,
      postgres,
      "Postgres"
    );
  }, [postgreSettings, updateDBConfig]);

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
    <Container active={active}>
      <Settings
        oracleSettings={oracleSettings}
        postgreSettings={postgreSettings}
        onOracleConfigChange={handleOracleConfigChange}
        onPostgresConfigChange={handlePostgresConfigChange}
      />
    </Container>
  );
});

export default SettingsPanel;
