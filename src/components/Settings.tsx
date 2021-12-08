import { Link, Typography } from "@material-ui/core";
import React, { useContext } from "react";
import styled from "styled-components";
import { DBType } from "../apis/sqlCommon";
import { GlobalContext } from "../App";
import EditorSettingsPanel from "../features/editorSettings/EditorSetttinsPanel";
import { Config } from "../generated/graphql";
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
  oracleSettings?: Config;
  postgreSettings?: Config;
  onOracleConfigChange: (config: Config) => void;
  onPostgresConfigChange: (config: Config) => void;
}

const Settings = ({
  oracleSettings,
  postgreSettings,
  onOracleConfigChange,
  onPostgresConfigChange,
}: SettingsProps) => {
  const { serverPort } = useContext(GlobalContext);

  return (
    <Container>
      {oracleSettings && (
        <DBSettings
          onChange={onOracleConfigChange}
          title="Oracle Configuaration"
          value={oracleSettings}
          type={DBType.Oracle}
        />
      )}
      {postgreSettings && (
        <DBSettings
          onChange={onOracleConfigChange}
          title="Postgres Configuaration"
          value={postgreSettings}
          type={DBType.Postgres}
        />
      )}
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
          <Link href={`http://127.0.0.1:${serverPort}/`} target="_blank">
            127.0.0.1:{serverPort}
          </Link>
        </Typography>
      </div>
    </Container>
  );
};

export default Settings;
