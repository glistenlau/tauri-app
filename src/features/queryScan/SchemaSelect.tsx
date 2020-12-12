import { createStyles, makeStyles } from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import TextField from "@material-ui/core/TextField";
import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import SchemaDropdown from "../../components/SchemaDropdown";
import { RootState } from "../../reducers";
import { setActiveSchema, setSelectedSchemas } from "./queryScanSlice";

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

const SchemaSelect = React.memo((props: RunnerControlToolBarProps) => {
  const { className, onClickRun, ...others } = props;
  const selectedSchemas = useSelector(
    (state: RootState) => state.queryScan.selectedSchemas
  );

  const activeSchema = useSelector(
    (state: RootState) => state.queryScan.activeSchema
  );

  const classes = useStyles();
  const dispatch = useDispatch();
  const schemas = useSelector(
    (state: RootState) => state.runnerControl.schemas
  );

  const handleChange = useCallback(
    (selected: string[]) => {
      if (!selected) {
        return;
      }
      dispatch(setSelectedSchemas(selected));
    },
    [dispatch]
  );

  const handleClickSchema = useCallback(
    (schema) => {
      dispatch(setActiveSchema(schema));
    },
    [dispatch]
  );

  return (
    <SchemaDropdown
      activeSchema={activeSchema}
      schemas={schemas}
      selectedSchemas={selectedSchemas || []}
      onChange={handleChange}
      onClickSchema={handleClickSchema}
    />
  );
});

export default SchemaSelect;
