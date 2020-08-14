import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import LinearProgress from "@material-ui/core/LinearProgress";
import IconButton from "@material-ui/core/IconButton";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { green, red } from "@material-ui/core/colors";
import { DiffResultType } from "../core/dbResultDiff";

const styles = makeStyles((theme) => ({
  runnerToolBar: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  button: {
    width: 48,
    height: 48,
  },
  runningProcess: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  ellipsis: {
    textOverflow: "ellipsis",
    width: "40%",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
}));

interface RunnerStatusBar {
  diff: boolean;
  diffRowCount: number;
  expand: boolean;
  isRunning: boolean;
  onDiffChange: any;
  onToggleExpand(): void;
  processed: number;
  resultPair: [DiffResultType, DiffResultType];
  rowCount: number;
  total: number;
}

const RunnerStatusBar = React.memo((props: RunnerStatusBar) => {
  const classes = styles();
  const {
    diffRowCount,
    expand,
    isRunning,
    processed,
    rowCount,
    total,
    diff,
    resultPair,
    onDiffChange,
    onToggleExpand,
  } = props;

  const hasError = React.useMemo(
    () =>
      (resultPair[0] && !resultPair[0].success) ||
      (resultPair[1] && !resultPair[1].success),
    [resultPair]
  );

  const hasResult = React.useMemo(
    () => resultPair[0] !== null || resultPair[1] !== null,
    [resultPair]
  );

  return (
    <div className={classes.runnerToolBar}>
      <IconButton className={classes.button} onClick={onToggleExpand}>
        {expand ? <ExpandMoreIcon /> : <ExpandLessIcon />}
      </IconButton>
      <Typography
        className={classes.ellipsis}
        style={{
          color: isRunning ? green[500] : undefined,
        }}
      >
        {`${processed} / ${total} ` + (isRunning ? "Running..." : "Finished")}
      </Typography>
      {hasResult && !hasError && (
        <Typography
          className={classes.ellipsis}
          style={{
            flex: 1,
            textAlign: "end",
            color: diffRowCount > 0 ? red[500] : green[500],
          }}
        >
          {diffRowCount > 1
            ? `Processed ${rowCount} rows, there are ${diffRowCount} different rows.`
            : `Processed ${rowCount} rows, there is ${diffRowCount} differnt row.`}
        </Typography>
      )}
      {hasResult && hasError && (
        <Typography
          className={classes.ellipsis}
          style={{
            flex: 1,
            textAlign: "end",
            color: red[500],
          }}
        >
          Error occurred.
        </Typography>
      )}

      <FormControlLabel
        style={{ justifySelf: "end", marginLeft: "auto" }}
        control={<Switch checked={diff} onChange={onDiffChange} value="diff" />}
        label="Diff"
      />
      {isRunning && (
        <LinearProgress
          className={classes.runningProcess}
          variant="buffer"
          value={(processed * 100) / total}
          valueBuffer={((processed + 1) * 100) / total}
        />
      )}
    </div>
  );
});

export default RunnerStatusBar;
