import clsx from "clsx";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";

import SplitQueryTable from "../../components/SplitQueryTable";
import SplitRunningPanel from "../../components/SplitRunningPanel";
import RunnerStatusBar from "../../components/RunnerStatusBar";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../reducers";
import { changePanelExpand, changePanelHeight } from "./runnerResultSlice";
import { Resizable } from "re-resizable";
import { withSize, SizeMeProps } from "react-sizeme";

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  containerHide: {
    flex: 0,
    height: 0,
    width: 0,
    overflow: "hidden",
  },
  tableContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "40%",
  },
  content: {
    flex: 1,
    display: "flex",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "40%",
  },
  hide: {
    height: 0,
  },
  process: {
    width: "50%",
    marginTop: 10,
  },
}));

interface ResultPanelProps {
  active: boolean;
  size: SizeMeProps["size"];
}

const THRESHOLD = 160;

const ResultPanel = React.memo(({ active, size }: ResultPanelProps) => {
  const classes = styles();
  const [diff, setDiff] = React.useState(false);

  const isRunning = useSelector(
    (rootState: RootState) => rootState.runnerControl.isRunning
  );
  const currentParametersPair = useSelector(
    (rootState: RootState) => rootState.runnerResult.currentParametersPair
  );
  const diffRowCount = useSelector(
    (rootState: RootState) => rootState.runnerResult.diffRowCount
  );
  const panelExpand = useSelector(
    (rootState: RootState) => rootState.runnerResult.panelExpand
  );
  const panelHeight = useSelector(
    (rootState: RootState) => rootState.runnerResult.panelHeight
  );
  const processedCount = useSelector(
    (rootState: RootState) => rootState.runnerResult.processedCount
  );
  const processedRowCount = useSelector(
    (rootState: RootState) => rootState.runnerResult.processedRowCount
  );
  const resultPair = useSelector(
    (rootState: RootState) => rootState.runnerResult.resultPair
  );
  const totalCount = useSelector(
    (rootState: RootState) => rootState.runnerResult.totalCount
  );
  const timeElapsedPair = useSelector(
    (rootState: RootState) => rootState.runnerResult.timeElapsedPair
  );

  const dispatch = useDispatch();
  const handlePanelResize = React.useCallback(
    (e: any, direction: any, ref: any, d: any) => {
      dispatch(changePanelHeight(size.height));
    },
    [dispatch, size.height]
  );

  const toggleDiff = React.useCallback(() => {
    setDiff(!diff);
  }, [diff]);

  const toogleExpand = React.useCallback(() => {
    dispatch(changePanelExpand(!panelExpand));
  }, [dispatch, panelExpand]);

  if (resultPair[0] === null && resultPair[1] === null) {
    return null;
  }

  return (
    <div
      className={clsx(
        classes.container,
        active ? undefined : classes.containerHide
      )}
    >
      <Resizable
        className={classes.container}
        onResizeStop={handlePanelResize}
        size={{
          height: panelExpand ? panelHeight : 48,
          width: "100%",
        }}
        minHeight={panelExpand ? THRESHOLD : 48}
        maxHeight="50vh"
        enable={{
          top: panelExpand,
          right: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <RunnerStatusBar
          diff={diff}
          diffRowCount={diffRowCount}
          expand={panelExpand}
          isRunning={isRunning}
          onDiffChange={toggleDiff}
          onToggleExpand={toogleExpand}
          resultPair={resultPair}
          rowCount={processedRowCount}
          processed={processedCount}
          total={totalCount}
        />
        <Divider />
        {isRunning && (
          <SplitRunningPanel
            runningParameters={currentParametersPair}
            show={panelExpand}
          />
        )}
        {!isRunning && (
          <SplitQueryTable
            parameters={currentParametersPair}
            diff={diff}
            height={panelHeight - 49}
            width={size.width}
            show={panelExpand}
            data={resultPair}
            timeElapsedPair={timeElapsedPair}
          />
        )}
      </Resizable>
    </div>
  );
});

export default withSize({ monitorHeight: true, monitorWidth: true })(
  ResultPanel
);
