import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import { Resizable } from "re-resizable";
import React, { useCallback, useContext, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SizeMeProps, withSize } from "react-sizeme";
import styled from "styled-components";
import { GlobalContext } from "../../App";
import RunnerStatusBar from "../../components/RunnerStatusBar";
import SplitQueryTable from "../../components/SplitQueryTable";
import SplitRunningPanel from "../../components/SplitRunningPanel";
import { RootState } from "../../reducers";
import {
  changePanelExpand,
  changePanelHeight,
  setResultActivePair,
} from "./runnerResultSlice";

const Container = styled.div<{ isActive: boolean }>`
  background-color: ${({ theme }) => theme.palette.background.default};
  display: flex;
  flex-direction: column;
  height: ${({ isActive }) => (isActive ? "auto" : "0px")};
  width: ${(isActive) => (isActive ? "100%" : "0px")};
  overflow: hidden;
`;

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "column",
    width: "100%",
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

const ResultPanel = ({ active, size }: ResultPanelProps) => {
  const classes = styles();
  const [diff, setDiff] = React.useState(false);

  const { isRunning } = useContext(GlobalContext);
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

  const schemaProgress = useSelector(
    (rootState: RootState) => rootState.runnerResult.schemaProgress
  );

  const selectedSchema = useSelector(
    (rootState: RootState) => rootState.runnerResult.selectedSchema
  );

  const schemaResults = useSelector(
    (rootState: RootState) => rootState.runnerResult.schemaResults
  );
  const resultActivePair = useSelector(
    (rootState: RootState) => rootState.runnerResult.resultActivePair
  );

  const currentProgress = useMemo(
    () => schemaProgress[selectedSchema],
    [schemaProgress, selectedSchema]
  );

  const currentResults = useMemo(
    () => schemaResults && schemaResults[selectedSchema],
    [schemaResults, selectedSchema]
  );

  const [height, width] = useMemo(
    () => [size.height || 0, size.width || 0],
    [size.height, size.width]
  );

  const dispatch = useDispatch();
  const handlePanelResize = React.useCallback(
    (e: any, direction: any, ref: any, d: any) => {
      dispatch(changePanelHeight(height));
    },
    [dispatch, height]
  );

  const toggleDiff = React.useCallback(() => {
    setDiff(!diff);
  }, [diff]);

  const toogleExpand = React.useCallback(() => {
    dispatch(changePanelExpand(!panelExpand));
  }, [dispatch, panelExpand]);

  const handleActivePairChange = useCallback(
    (value) => {
      dispatch(setResultActivePair(value));
    },
    [dispatch]
  );

  return (
    <Container isActive={active}>
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
        <Divider />
        <RunnerStatusBar
          activePair={resultActivePair}
          diff={diff}
          expand={panelExpand}
          isRunning={isRunning}
          onActivePairChange={handleActivePairChange}
          onDiffChange={toggleDiff}
          onToggleExpand={toogleExpand}
          runningProgress={currentProgress}
          finishedResults={currentResults}
        />
        {panelExpand && <Divider />}
        {isRunning && panelExpand && (
          <SplitRunningPanel
            runningProgress={currentProgress}
            show={panelExpand}
          />
        )}
        {!isRunning && panelExpand && (
          <SplitQueryTable
            resultActivePair={resultActivePair}
            diff={diff}
            height={panelHeight - 49}
            width={width}
            show={panelExpand}
            value={currentResults}
          />
        )}
      </Resizable>
    </Container>
  );
};

export default withSize({ monitorHeight: true, monitorWidth: true })(
  ResultPanel
);
