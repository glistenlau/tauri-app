import React from "react";
import { useSelector, useDispatch } from "react-redux";
import clsx from "clsx";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import TextField from "@material-ui/core/TextField";
import { green } from "@material-ui/core/colors";
import { createStyles, makeStyles } from "@material-ui/core/styles";

import { RootState } from "../../reducers";
import { changeSchema } from "./runnerControlSlice";
import databaseConsole from "../../core/databaseConsole";
import { showNotification } from "../../actions";
import { Typography } from "@material-ui/core";
import ProgressSplitIconButton from "../../components/ProgressSplitIconButton";
import SVGIcon from "../../components/SVGIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    runnerContainer: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    inputSchema: {
      backgroundColor: theme.palette.background.paper,
      marginLeft: 10,
      width: 150,
    },
    play: {
      color: green[500],
    },
    grouped: {
      minWidth: 0,
    },
  })
);

export enum RunMode {
    DUAL,
    ORACLE,
    POSTGRES,
}

export interface RunOptions {
    mode: RunMode,
    sortResult?: boolean,
}

export interface RunnerControlToolBarProps {
  onClickRun: (options: RunOptions) => void; 
  className?: any;
}

const RunnerControlToolBar = React.memo((props: RunnerControlToolBarProps) => {
  const { className, onClickRun, ...others } = props;

  const classes = useStyles();
  const dispatch = useDispatch();
  const schema = useSelector((state: RootState) => state.runnerControl.schema);
  const isRunning = useSelector(
    (state: RootState) => state.runnerControl.isRunning
  );
  const [schemaValue, setSchemaValue] = React.useState(schema);

  const handleChangeSchema = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSchemaValue(value);
    },
    []
  );

  React.useEffect(() => {
    setSchemaValue(schema);
  }, [schema]);

  const handleBlur = React.useCallback(() => {
    dispatch(changeSchema(schemaValue));
    try {
      databaseConsole.setSchema(schemaValue);
    } catch (e) {
      dispatch(showNotification("Set schema failed.", "error"));
    }
  }, [dispatch, schemaValue]);

  const handleClickRun = React.useCallback(async () => {
    await onClickRun({mode: RunMode.DUAL});
  }, [onClickRun]);

  const handleSelectMenu = React.useCallback(async (index) => {
      if (index === 0) {
          await onClickRun({mode: RunMode.ORACLE});
      } else {
          await onClickRun({mode: RunMode.POSTGRES});
      }
  }, [onClickRun]);

  const runOracleOption = React.useMemo(() => (
    <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <SVGIcon
      width={20}
      height={20}
      name="database"
      style={{ marginRight: 10 }}
    />
    <Typography>{"Run Oracle"}</Typography>
  </div>
  ), []);

  const runPostgresOption = React.useMemo(() => (
    <div
    style={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <SVGIcon
      width={20}
      height={20}
      name="postgres"
      fill="#9ba0a6"
      style={{ marginRight: 10 }}
    />
    <Typography>{"Run Postgres"}</Typography>
  </div>
  ), []);

  const runOptions = React.useMemo(() => [runOracleOption, runPostgresOption], [runOracleOption, runPostgresOption]);

  return (
    <div className={clsx(classes.runnerContainer, className)} {...others}>
      <TextField
        className={classes.inputSchema}
        color="primary"
        id="schema"
        label="Schema"
        size="small"
        variant="outlined"
        margin="dense"
        onChange={handleChangeSchema}
        onBlur={handleBlur}
        value={schemaValue}
      />

      <ProgressSplitIconButton
        onClick={handleClickRun}
        loading={isRunning}
        disabled={isRunning}
        onSelectItem={handleSelectMenu}
        options={runOptions}
        containerStyle={{
            marginLeft: 10,
            marginRight: 10,
        }}
      >
        <PlayArrowIcon
          className={isRunning ? undefined : classes.play}
          color={isRunning ? "disabled" : undefined}
        />
      </ProgressSplitIconButton>
    </div>
  );
});

export default RunnerControlToolBar;
