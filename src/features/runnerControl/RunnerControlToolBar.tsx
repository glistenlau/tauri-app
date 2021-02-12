import { createStyles, makeStyles, MenuItem } from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import TextField from "@material-ui/core/TextField";
import CompareIcon from "@material-ui/icons/Compare";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import clsx from "clsx";
import React, { useCallback, useContext, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import OracleClient from "../../apis/oracle";
import QueryRunner, {
  ParameterGenerateStrategy,
  Query
} from "../../apis/queryRunner";
import { DBType } from "../../apis/sqlCommon";
import { GlobalContext } from "../../App";
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

  const { isRunning } = useContext(GlobalContext);

  const fetchSchemas = useCallback(
    async (e) => {
      e.stopPropagation();
      const schemas = await QueryRunner.getAllSchemas();
      dispatch(setSchemas(schemas));
    },
    [dispatch]
  );

  const handleClickRun = React.useCallback(async () => {
    try {
      await onClickRun({ mode: RunMode.DUAL });
    } catch (e) {}
  }, [onClickRun]);

  const handleClickCompareShadow = useCallback(async () => {
    const sql = `
      SELECT Name, ShadowedName
      FROM ANACONDA.ShadowedObject
      WHERE ObjectType = 'TABLE'
    `;
    const rst = await OracleClient.execute(sql, "ANACONDA");
    if (rst.success) {
      const tableNames = rst.result.result?.rows?.map((row) => row[0]);
      const shadowedTableNames = rst.result.result?.rows?.map((row) => row[1]);

      if (!tableNames || !shadowedTableNames) {
        return;
      }

      for (let i = 0; i < tableNames?.length; i++) {
        const originalQuery: Query = {
          dbType: DBType.Oracle,
          mode: ParameterGenerateStrategy.Normal,
          statement: `SELECT * FROM ${tableNames[i]}`,
        };
        const shadowQuery: Query = {
          dbType: DBType.Oracle,
          mode: ParameterGenerateStrategy.Normal,
          statement: `SELECT * FROM ${shadowedTableNames[i]}`,
        };

        const runnerQuery = {
          "GREENCO": [originalQuery, shadowQuery],
        };

        const runnerResult = await QueryRunner.scanQueries(runnerQuery);
        console.log("runner result: ", runnerResult);
      }
    }
  }, []);

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
      <ProcessIconButton
        title="Run Queries"
        loading={isRunning}
        disabled={isRunning}
        onClick={handleClickCompareShadow}
      >
        <CompareIcon className={isRunning ? undefined : classes.play} />
      </ProcessIconButton>
    </div>
  );
});

export default RunnerControlToolBar;
