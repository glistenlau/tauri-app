import React, { useCallback } from "react";
import styled from "styled-components";
import EditorSettingsPanel from "../features/editorSettings/EditorSetttinsPanel";
import {
  isOracleSettings,
  OracleSettings,
  PostgreSettings
} from "../features/settings/settingsSlice";
import DBSettings from "./DBSettings";

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
    </Container>
  );
};

export default Settings;
