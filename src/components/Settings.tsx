import React, { useCallback } from "react";

import { createStyles, makeStyles } from "@material-ui/core/styles";

import DBSettings from "./DBSettings";
import EditorSettingsPanel from "../features/editorSettings/EditorSetttinsPanel";
import {
    OracleSettings,
    PostgreSettings,
    isOracleSettings,
} from "../features/settings/settingsSlice";

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

interface SettingsProps {
    active: boolean;
    oracleSettings: OracleSettings;
    postgreSettings: PostgreSettings;
    onOracleConfigChange: (config: OracleSettings) => void;
    onPostgresConfigChange: (config: PostgreSettings) => void;
}

const Settings = ({
    active,
    oracleSettings,
    postgreSettings,
    onOracleConfigChange,
    onPostgresConfigChange,
}: SettingsProps) => {
    const classes = useStyles();
    const handleDBSettingsChange = useCallback((config: OracleSettings | PostgreSettings) => {
        if (isOracleSettings(config)) {
            onOracleConfigChange(config);
        } else {
            onPostgresConfigChange(config);
        }
        
    }, [])

    return (
        <div className={active ? classes.container : classes.containerHide}>
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
        </div>
    );
};

export default Settings;
