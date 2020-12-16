import { createStyles, Divider, makeStyles } from "@material-ui/core";
import React, { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { openParameterModal, scanRunQuery } from "../../actions";
import SplitEditor, { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { evaluateParamsPair } from "../../core/parameterEvaluator";
import { RootState } from "../../reducers";
import { getParameterMarkerPosition } from "../../util";
import { changeSortResults } from "../runnerControl/runnerControlSlice";
import { RunMode, RunOptions } from "../runnerControl/RunnerControlToolBar";
import { changeConsleValuePair } from "./databaseConsoleSlice";
import DatabaseConsoleToolBar from "./DatabaseConsoleToolBar";

interface DatabaseConsolePageProps {
  active: boolean;
}

const Container = styled(TabContent)`
  display: flex;
  flex-direction: column;
`;

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      height: "50%",
      width: "100%",
      flex: 1,
    },
    hideContainer: {
      hight: 0,
      wdith: 0,
      flex: 0,
      overflow: "hidden",
    },
  })
);

const DatabaseConsolePage = React.memo(
  ({ active }: DatabaseConsolePageProps) => {
    const splitEditorRef = useRef(null as SplitEditorHandle | null);
    const editorRefPair = React.useMemo(() => [null, null], []);
    const dispatch = useDispatch();
    const schema = useSelector(
      (state: RootState) => state.runnerControl.schema
    );
    const consoleValuePair = useSelector(
      (state: RootState) => state.databaseConsole.consoleValuePair
    );

    const classes = useStyles();

    const handleClick = useCallback(async (runOptions: RunOptions) => {
      console.log("click", runOptions, splitEditorRef.current);
      const valuePair = splitEditorRef.current?.getEffectiveValue() || ["", ""];
      console.log("valuePair", valuePair, runOptions);

      const mode = runOptions.mode;

      switch (mode) {
        case RunMode.ORACLE: {
        }
        case RunMode.POSTGRES: {
        }
        case RunMode.DUAL: {
        }
        default: {
        }
      }
    }, []);

    const handleClickRun = React.useCallback(
      async (sortResults) => {
        const selected = editorRefPair.map((aceEditor: any) => {
          if (!aceEditor) {
            return null;
          }

          const selections: Array<any> = aceEditor.getSelections();

          return (
            selections &&
            selections
              .map((s: any) => aceEditor.getModel().getValueInRange(s))
              .join("")
          );
        });

        const oraStatement = selected[0] ? selected[0] : consoleValuePair[0];
        let pgStatement = selected[1] ? selected[1] : consoleValuePair[1];

        if (pgStatement.trim().length === 0) {
          pgStatement = oraStatement;
        }

        let oraParams = getParameterMarkerPosition(oraStatement).map((p) => ({
          ...p,
          raw: "",
        }));
        let pgParams = getParameterMarkerPosition(pgStatement).map((p) => ({
          ...p,
          raw: "",
        }));

        const storedParams: any = null;

        if (storedParams.oracle && !storedParams.postgres) {
          storedParams.postgres = storedParams.oracle;
        }

        if (storedParams.postgres && !storedParams.oracle) {
          storedParams.oracle = storedParams.postgres;
        }

        if (
          storedParams &&
          storedParams.oracle &&
          storedParams.oracle.length === oraParams.length
        ) {
          oraParams = oraParams.map((p, i) =>
            Object.assign({}, p, storedParams.oracle[i])
          );
        }

        if (
          storedParams &&
          storedParams.postgres &&
          storedParams.postgres.length === pgParams.length
        ) {
          pgParams = pgParams.map((p, i) =>
            Object.assign({}, p, storedParams.postgres[i])
          );
        }

        let sync = oraParams.length === pgParams.length;

        if (sync) {
          for (let i = 0; i < oraParams.length; i++) {
            if (oraParams[i].raw !== pgParams[i].raw) {
              sync = false;
              break;
            }
          }
        }

        const statements = [oraStatement, pgStatement];
        let parameters: any = [oraParams, pgParams];
        parameters = await evaluateParamsPair(parameters, schema);

        dispatch(changeSortResults(sortResults));

        if (
          (oraParams && oraParams.length > 0) ||
          (pgParams && pgParams.length > 0)
        ) {
          dispatch(openParameterModal(statements, parameters, sync));
        } else {
          await dispatch(
            scanRunQuery(statements, parameters, schema, false, sortResults)
          );
        }
      },
      [consoleValuePair, dispatch, editorRefPair, schema]
    );

    const handleValuePairChange = useCallback(
      (valuePair: [string, string]) => {
        dispatch(changeConsleValuePair(valuePair));
      },
      [dispatch]
    );

    const handleEditorRef = React.useCallback(
      (e: any, index: number) => {
        editorRefPair[index] = e;
      },
      [editorRefPair]
    );

    return (
      <Container active={active}>
        <DatabaseConsoleToolBar onClickRun={handleClick} />
        <Divider />
        <SplitEditor
          ref={splitEditorRef}
          diff={false}
          valuePair={consoleValuePair}
          onChange={handleValuePairChange}
        />
      </Container>
    );
  }
);

export default DatabaseConsolePage;
