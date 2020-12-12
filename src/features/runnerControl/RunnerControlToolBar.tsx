import { createStyles, makeStyles, MenuItem } from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import TextField from "@material-ui/core/TextField";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import RefreshIcon from "@material-ui/icons/Refresh";
import clsx from "clsx";
import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import QueryRunner from "../../apis/queryRunner";
import LabelWithDdIcons from "../../components/LabelWithDbIcons";
import ProcessIconButton from "../../components/ProgressIconButton";
import { RootState } from "../../reducers";
import { changeSchema, setSchemas } from "./runnerControlSlice";

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

const RefreshContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const SchemaTextField = styled(TextField)`
  margin-left: 10px;
  width: 200px;
`;

export enum RunMode {
  DUAL,
  ORACLE,
  POSTGRES,
}

export interface RunOptions {
  mode: RunMode;
  sortResult?: boolean;
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
  const schemas = useSelector(
    (state: RootState) => state.runnerControl.schemas
  );

  const isRunning = useSelector(
    (state: RootState) => state.runnerControl.isRunning
  );

  const fetchSchemas = useCallback(async () => {
    const schemas = await QueryRunner.getAllSchemas();
    dispatch(setSchemas(schemas));
  }, [dispatch]);

  const handleClickRun = React.useCallback(async () => {
    try {
      await onClickRun({ mode: RunMode.DUAL });
    } catch (e) {
      console.log("run errror: ", e);
    }
  }, [onClickRun]);

  const handleSchemaChange = useCallback(
    (e) => {
      e.preventDefault();
      dispatch(changeSchema(e.target.value));
    },
    [dispatch]
  );

  const schemaMenuItems = useMemo(() => {
    if (!schemas) {
      return null;
    }

    const schemaList: string[] = [];
    const oracle_schema_set = new Set();
    const postgres_schema_set = new Set();
    schemas[0].forEach((s) => {
      const s_low = s.toLowerCase();
      schemaList.push(s_low);
      oracle_schema_set.add(s_low);
    });

    schemas[1].forEach((s) => {
      if (!oracle_schema_set.has) {
        schemaList.push(s);
      }
      postgres_schema_set.add(s);
    });
    return schemaList.map((s, i) => {
      return (
        <MenuItem key={s} value={s}>
          <LabelWithDdIcons
            showOracleIcon={oracle_schema_set.has(s)}
            showPostgresIcon={postgres_schema_set.has(s)}
          >
            {s}
          </LabelWithDdIcons>
        </MenuItem>
      );
    });
  }, [schemas]);

  return (
    <div className={clsx(classes.runnerContainer, className)} {...others}>
      <SchemaTextField
        select
        disabled={isRunning}
        color="primary"
        id="schema"
        label="schema"
        size="small"
        variant="outlined"
        margin="dense"
        value={schema}
        onChange={handleSchemaChange}
      >
        <RefreshContainer onClick={fetchSchemas}>
          <RefreshIcon />
          Refresh
        </RefreshContainer>
        {schemaMenuItems}
      </SchemaTextField>
      <ProcessIconButton
        title="Run Queries"
        loading={isRunning}
        disabled={isRunning}
        onClick={handleClickRun}
      >
        <PlayArrowIcon
          className={isRunning ? undefined : classes.play}
          color={isRunning ? "disabled" : undefined}
        />
      </ProcessIconButton>
    </div>
  );
});

export default RunnerControlToolBar;
