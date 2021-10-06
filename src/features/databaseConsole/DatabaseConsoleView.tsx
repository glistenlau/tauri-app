import { Divider } from "@material-ui/core";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import SplitEditor, { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { useFormatSqlLazyQuery } from "../../generated/graphql";
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
  const [valuePair, setValuePair] = useState<[string, string]>(["", ""]);
  const splitEditorRef = useRef(null as SplitEditorHandle | null);
  const dispatch = useDispatch();
  const snackbar = useSnackbar();
  const consoleValuePair = useSelector(
    (state: RootState) => state.databaseConsole.consoleValuePair
  );

  const [runFormatSql, { data: foramtSqlRes }] = useFormatSqlLazyQuery();

  useEffect(() => {
    if (!foramtSqlRes) {
      return;
    }
    setValuePair(foramtSqlRes.formatSql as [string, string]);
  }, [foramtSqlRes]);

  useEffect(() => {
    setValuePair(consoleValuePair);
  }, [consoleValuePair]);

  const handleClickFormat = React.useCallback(() => {
    runFormatSql({ variables: { sqlStmts: valuePair } });
  }, [runFormatSql, valuePair]);

  const handleClickRun = React.useCallback(
    async (sortResults) => {
      const values = splitEditorRef.current?.getEffectiveValue();
      if (
        !values ||
        values.filter((value) => value.length === 0).length === 2
      ) {
        snackbar.enqueueSnackbar("There is no query to run.", {
          variant: "warning",
        });
        return;
      }
      await dispatch(loadQueryScan(values));
    },
    [dispatch, snackbar]
  );

  const handleValuePairChange = useCallback((valuePair: [string, string]) => {
    setValuePair(valuePair);
  }, []);

  const handleEditorBlur = useCallback(() => {
    dispatch(changeConsleValuePair(valuePair));
  }, [dispatch, valuePair]);

  return (
    <Container active={active}>
      <DatabaseConsoleToolBar
        onClickRun={handleClickRun}
        onClickFormat={handleClickFormat}
      />
      <Divider />
      <SplitEditor
        ref={splitEditorRef}
        diff={false}
        valuePair={valuePair}
        onChange={handleValuePairChange}
        onBlur={handleEditorBlur}
      />
    </Container>
  );
};

export default DatabaseConsolePage;
