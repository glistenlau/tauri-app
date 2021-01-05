import { Divider } from "@material-ui/core";
import { useSnackbar } from "notistack";
import React, { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import SplitEditor, { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { RootState } from "../../reducers";
import { loadQueryScan } from "../queryScan/queryScanSlice";
import { changeConsleValuePair } from "./databaseConsoleSlice";
import DatabaseConsoleToolBar from "./DatabaseConsoleToolBar";

interface DatabaseConsolePageProps {
  active: boolean;
}

const Container = styled(TabContent)`
  display: flex;
  flex-direction: column;
`;

const DatabaseConsolePage = ({ active }: DatabaseConsolePageProps) => {
  const splitEditorRef = useRef(null as SplitEditorHandle | null);
  const dispatch = useDispatch();
  const snackbar = useSnackbar();
  const consoleValuePair = useSelector(
    (state: RootState) => state.databaseConsole.consoleValuePair
  );

  const handleClickRun = React.useCallback(
    async (sortResults) => {
      const values = splitEditorRef.current?.getEffectiveValue();
      if (
        !values ||
        values.filter((value) => value.length === 0).length === 2
      ) {
        snackbar.enqueueSnackbar("There is no query to run.", {
          variant: "warning"
        });
        return;
      }
      await dispatch(loadQueryScan(values));
    },
    [dispatch, snackbar]
  );

  const handleValuePairChange = useCallback(
    (valuePair: [string, string]) => {
      dispatch(changeConsleValuePair(valuePair));
    },
    [dispatch]
  );

  return (
    <Container active={active}>
      <DatabaseConsoleToolBar onClickRun={handleClickRun} />
      <Divider />
      <SplitEditor
        ref={splitEditorRef}
        diff={false}
        valuePair={consoleValuePair}
        onChange={handleValuePairChange}
      />
    </Container>
  );
};

export default DatabaseConsolePage;
