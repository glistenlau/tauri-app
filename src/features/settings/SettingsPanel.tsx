import { useSnackbar } from "notistack";
import React, { useCallback, useEffect } from "react";
import styled from "styled-components";
import Settings from "../../components/Settings";
import TabContent from "../../components/TabContent";
import {
  AppStateKey,
  Config,
  Dbtype,
  useSetConfigMutation,
} from "../../generated/graphql";
import { useAppState } from "../../hooks/useAppState";
import {} from "./settingsSlice";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: column;
`;

const SettingsPanel = React.memo(({ active }: any) => {
  const snackBar = useSnackbar();
  const [oracleConfig, setOracleConfig] = useAppState<Config>(
    AppStateKey.OralceConfig,
    {
      host: "localhost",
      port: "1521",
      db: "anaconda",
      username: "anaconda",
      password: "anaconda",
    }
  );
  const [pgConfig, setPgConfig] = useAppState<Config>(
    AppStateKey.PostgresConfig,
    {
      host: "localhost",
      port: "5432",
      db: "planning",
      username: "postgres",
      password: "#postgres#",
    }
  );
  const [setConfigMutation, { data, loading }] = useSetConfigMutation();

  useEffect(() => {
    if (!oracleConfig) {
      return;
    }
    setConfigMutation({
      variables: { dbType: Dbtype.Oracle, dbConfig: oracleConfig },
    })
      .then(() =>
        snackBar.enqueueSnackbar(`Successfully connected to the Oracle.`, {
          variant: "success",
        })
      )
      .catch((e) =>
        snackBar.enqueueSnackbar(`Failed to connect to Oracle: ${e}`, {
          variant: "error",
        })
      );
  }, [oracleConfig, setConfigMutation, snackBar]);

  useEffect(() => {
    if (!pgConfig) {
      return;
    }
    setConfigMutation({
      variables: { dbType: Dbtype.Postgres, dbConfig: pgConfig },
    })
      .then(() =>
        snackBar.enqueueSnackbar(`Successfully connected to the Postgres.`, {
          variant: "success",
        })
      )
      .catch((e) =>
        snackBar.enqueueSnackbar(`Failed to connect to Postgres: ${e}`, {
          variant: "error",
        })
      );
  }, [pgConfig, setConfigMutation, snackBar]);

  const handleOracleConfigChange = useCallback(
    (config: Config) => {
      setOracleConfig(config);
    },
    [setOracleConfig]
  );

  const handlePostgresConfigChange = useCallback(
    (config: Config) => {
      setPgConfig(config);
    },
    [setPgConfig]
  );

  return (
    <Container active={active}>
      <Settings
        oracleSettings={oracleConfig}
        postgreSettings={pgConfig}
        onOracleConfigChange={handleOracleConfigChange}
        onPostgresConfigChange={handlePostgresConfigChange}
      />
    </Container>
  );
});

export default SettingsPanel;
