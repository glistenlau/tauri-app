import React from "react";
import { useSelector, useDispatch } from "react-redux";
import clsx from "clsx";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";
import TextField from "@material-ui/core/TextField";
import { green } from "@material-ui/core/colors";
import { createStyles, makeStyles } from "@material-ui/core/styles";

import ProcessIconButton from "../../components/ProcessIconButton";
import { RootState } from "../../reducers";
import { changeSchema } from "./runnerControlSlice";
import databaseConsole from "../../core/databaseConsole";
import { showNotification } from "../../actions";

const useStyles = makeStyles((theme) =>
  createStyles({
    runnerContainer: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      alignItems: "center",
    },
    inputSchema: {
      backgroundColor: theme.palette.background.paper,
      marginLeft: 10,
      width: 150,
    },
    play: {
      color: green[500],
    },
  })
);

export interface RunnerControlToolBarProps {
  onClickRun: Function;
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
  const sortResults = useSelector(
    (state: RootState) => state.runnerControl.sortResults
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

  const handleClickRun = React.useCallback(() => {
    onClickRun(false);
  }, [onClickRun]);

  const handleClickSortRun = React.useCallback(() => {
    onClickRun(true);
  }, [onClickRun]);

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

      <ProcessIconButton
        title="Run query"
        onClick={handleClickRun}
        loading={isRunning && !sortResults}
        disabled={isRunning}
      >
        <PlayArrowIcon
          className={isRunning ? undefined : classes.play}
          color={isRunning ? "disabled" : undefined}
        />
      </ProcessIconButton>
      <ProcessIconButton
        title="Run query and sort results"
        onClick={handleClickSortRun}
        loading={isRunning && sortResults}
        disabled={isRunning}
      >
        <PlayCircleOutlineIcon
          className={isRunning ? undefined : classes.play}
          color={isRunning ? "disabled" : undefined}
        />
      </ProcessIconButton>
    </div>
  );
});

export default RunnerControlToolBar;
