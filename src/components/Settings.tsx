import { Link, Typography } from "@material-ui/core";
import React, { useCallback, useContext } from "react";
import styled from "styled-components";
import { GlobalContext } from "../App";
import EditorSettingsPanel from "../features/editorSettings/EditorSetttinsPanel";
import {
  isOracleSettings,
  OracleSettings,
  PostgreSettings
} from "../features/settings/settingsSlice";
import DBSettings from "./DBSettings";
import SVGIcon from "./SVGIcon";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  align-items: center;
  overflow: scroll;
  height: 100%;
`;

interface SettingsProps {
  oracleSettings: OracleSettings;
  postgreSettings: PostgreSettings;
  onOracleConfigChange: (config: OracleSettings) => void;
  onPostgresConfigChange: (config: PostgreSettings) => void;
}

const Settings = ({
  oracleSettings,
  postgreSettings,
  onOracleConfigChange,
  onPostgresConfigChange,
}: SettingsProps) => {
  const handleDBSettingsChange = useCallback(
    (config: OracleSettings | PostgreSettings) => {
      if (isOracleSettings(config)) {
        onOracleConfigChange(config);
      } else {
        onPostgresConfigChange(config);
      }
    },
    [onOracleConfigChange, onPostgresConfigChange]
  );

  const { serverPort } = useContext(GlobalContext);

  return (
    <Container>
      <DBSettings
        onChange={handleDBSettingsChange}
        title="Oracle Configuaration"
        value={oracleSettings}
      />
      <DBSettings
        onChange={handleDBSettingsChange}
        title="Postgres Configuaration"
        value={postgreSettings}
      />
      <EditorSettingsPanel />
      <div
        style={{
          height: 48,
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <SVGIcon
          width={20}
          height={20}
          name="graphql"
          style={{ marginRight: 10 }}
        />
        <Typography>
          running at{" "}
          <Link
            href={`http://127.0.0.1:${serverPort}/`}
            target="_blank"
          >
            127.0.0.1:{serverPort}
          </Link>
        </Typography>
      </div>
    </Container>
  );
};

export default Settings;
