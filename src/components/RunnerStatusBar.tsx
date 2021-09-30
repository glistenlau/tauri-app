import { green, red } from "@material-ui/core/colors";
import IconButton from "@material-ui/core/IconButton";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import React, { useMemo } from "react";
import styled from "styled-components";
import { ScanProcess, ScanSchemaResult } from "../apis/queryRunner";
import SchemaSelect from "../features/runnerResult/SchemaSelect";
import DiffToolBar from "./DiffToolbar";

const SelectContainer = styled.div`
  margin-left: 5px;
  margin-right: 5px;
`;

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

interface RunnerStatusBarProps {
  diff: boolean;
  expand: boolean;
  isRunning: boolean;
  onDiffChange: any;
  onToggleExpand(): void;
  runningProgress?: [ScanProcess, ScanProcess];
  finishedResults?: ScanSchemaResult;
  activePair: [boolean, boolean];
  onActivePairChange: (value: [boolean, boolean]) => void;
}

const RunnerStatusBar = React.memo((props: RunnerStatusBarProps) => {
  const classes = styles();
  const {
    activePair,
    expand,
    diff,
    onDiffChange,
    onToggleExpand,
    onActivePairChange,
    runningProgress,
    finishedResults,
    isRunning,
  } = props;

  const hasError = useMemo(
    () =>
      finishedResults?.queryResults.reduce(
        (pre, cur) => pre || cur?.results.error != null,
        false
      ) || false,
    [finishedResults?.queryResults]
  );

  const hasResult = React.useMemo(
    () =>
      finishedResults?.queryResults.reduce(
        (pre, cur) => pre || cur?.results.result != null,
        false
      ) || false,
    [finishedResults?.queryResults]
  );

  const isRunningLocal = useMemo(() => {
    if (!isRunning) {
      return false;
    }

    return (
      finishedResults?.queryResults.reduce(
        (pre, cur) => pre || cur?.results == null,
        false
      ) || false
    );
  }, [finishedResults?.queryResults, isRunning]);

  const [processed, total] = useMemo(() => {
    const fromResults = finishedResults?.queryResults.reduce(
      (pre, cur) => {
        if (cur == null) {
          return pre;
        }
        return [
          Math.max(pre[0], cur.progress.finished),
          Math.max(pre[1], cur.progress.total),
        ];
      },
      [0, 0]
    );
    const fromProgress = runningProgress?.reduce(
      (pre, cur) => {
        return [Math.max(pre[0], cur.finished), Math.max(pre[1], cur.total)];
      },
      [0, 0]
    );

    if (fromResults == null && fromProgress == null) {
      return [0, 0];
    } else if (fromProgress == null) {
      return fromResults || [0, 0];
    } else if (fromResults == null) {
      return fromProgress || [0, 0];
    } else {
      return [
        Math.max(fromResults[0], fromProgress[0]),
        Math.max(fromResults[1], fromProgress[1]),
      ];
    }
  }, [finishedResults?.queryResults, runningProgress]);

  const [rowCount, diffRowCount] = useMemo(() => {
    const rc =
      finishedResults?.queryResults.reduce(
        (pre, cur) => Math.max(cur?.results.result?.rowCount || 0, pre),
        0
      ) || 0;
    const dc = Object.keys(finishedResults?.diffResults || {}).length;
    return [rc, dc];
  }, [finishedResults?.diffResults, finishedResults?.queryResults]);

  return (
    <div className={classes.runnerToolBar}>
      <IconButton className={classes.button} onClick={onToggleExpand}>
        {expand ? <ExpandMoreIcon /> : <ExpandLessIcon />}
      </IconButton>
      <SelectContainer>
        <SchemaSelect isRunning={isRunning} />
      </SelectContainer>
      <Typography
        className={classes.ellipsis}
        style={{
          color: isRunningLocal ? green[500] : undefined,
        }}
      >
        {`${processed} / ${total} ` +
          (isRunningLocal ? "Running..." : "Finished")}
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
            ? `${diffRowCount} different rows`
            : `${diffRowCount} differnt row`}
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

      <DiffToolBar
        diffMode={diff}
        onToogleDiff={onDiffChange}
        activePair={activePair}
        onActivePairChange={onActivePairChange}
      />
      {isRunningLocal && (
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
