import React from "react";

import { createStyles, makeStyles } from "@material-ui/core/styles";

import DBSettings from "./DBSettings";
import EditorSettingsPanel from "../features/editorSettings/EditorSetttinsPanel";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      padding: 10,
      alignItems: "center",
      overflow: "scroll",
      width: "100%",
    },
    containerHide: {
      height: 0,
      width: 0,
      overflow: "hidden",
    },
  })
);

const Settings = (props: any) => {
  const classes = useStyles();
  const {
    active,
    oracleSetting,
    postgresSetting,
    onOracleConfigChange,
    onPostgresConfigChange,
  } = props;

  return (
    <div className={active ? classes.container : classes.containerHide}>
      <DBSettings
        onChange={onOracleConfigChange}
        title="Oracle Configuaration"
        value={oracleSetting}
      />
      <DBSettings
        onChange={onPostgresConfigChange}
        title="Postgres Configuaration"
        value={postgresSetting}
      />
      <EditorSettingsPanel />
    </div>
  );
};

export default Settings;
