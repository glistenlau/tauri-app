import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import SettingsPanelBase from "../../components/SettingsPanelBase";
import { RootState } from "../../reducers";
import { changeSettings } from "./editorSettingsSlice";


const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      paddingRight: 10,
      paddingLeft: 10,
      paddingTop: 10,
    },
    hostContainer: {
      display: "flex",
      flexDirection: "row",
    },
    mainInput: {
      width: 200,
    },
    input: {
      width: 120,
      marginLeft: 20,
    },
  })
);

const EditorSettingsContent = React.memo(
  ({ disabled, onThemeChange, onFontSizeChange, value }: any) => {
    const classes = useStyles();

    return (
      <div className={classes.container}>
        <div className={classes.hostContainer}>
          <TextField
            select
            className={classes.mainInput}
            color="primary"
            disabled={disabled}
            id="host"
            label="Theme"
            size="small"
            onChange={onThemeChange}
            value={value.theme}
            margin="dense"
          >
            {/* {themeList.map((theme) => (
              <MenuItem key={theme} value={theme}>
                {theme}
              </MenuItem>
            ))} */}
          </TextField>
          <TextField
            className={classes.input}
            color="primary"
            disabled={disabled}
            id="port"
            label="Font Size"
            size="small"
            onChange={onFontSizeChange}
            value={value.fontSize}
            margin="dense"
          />
        </div>
      </div>
    );
  }
);

const EditorSettingsPanel = React.memo(() => {
  const theme = useSelector((state: RootState) => state.editorSettings.theme);
  const fontSize = useSelector(
    (state: RootState) => state.editorSettings.fontSize
  );
  const dispatch = useDispatch();
  const [localValue, setLocalValue] = React.useState({ theme, fontSize });

  const handleThemeChange = React.useCallback(
    (e) => {
      setLocalValue(Object.assign({}, localValue, { theme: e.target.value }));
    },
    [localValue]
  );

  const handleFontSizeChange = React.useCallback(
    (e) => {
      setLocalValue(
        Object.assign({}, localValue, { fontSize: e.target.value })
      );
    },
    [localValue]
  );

  const handleSubmit = React.useCallback(
    (save) => {
      if (!save) {
        setLocalValue({ theme, fontSize });
        return;
      }
      dispatch(changeSettings(localValue));
    },
    [fontSize, theme, localValue, dispatch]
  );

  const settingContentRenderer = React.useCallback(
    (disabled: boolean) => (
      <EditorSettingsContent
        value={localValue}
        disabled={disabled}
        onThemeChange={handleThemeChange}
        onFontSizeChange={handleFontSizeChange}
      />
    ),
    [handleFontSizeChange, handleThemeChange, localValue]
  );

  return (
    <SettingsPanelBase
      title="Editor Settings"
      iconName="editFill"
      onSubmit={handleSubmit}
    >
      {settingContentRenderer}
    </SettingsPanelBase>
  );
});

export default EditorSettingsPanel;
