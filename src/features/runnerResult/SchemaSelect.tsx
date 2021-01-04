import { CircularProgress, MenuItem, Select } from "@material-ui/core";
import { green, orange, red } from "@material-ui/core/colors";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import WarningIcon from "@material-ui/icons/Warning";
import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ScanProcess, ScanSchemaResult } from "../../apis/queryRunner";
import LabelWithIcon from "../../components/LabelWithIcon";
import { RootState } from "../../reducers";
import { setSelectedSchema } from "./runnerResultSlice";
interface SchemaSelectProps {
  isRunning: boolean;
}

const SchemaSelect: React.FC<SchemaSelectProps> = ({ isRunning }) => {
  const schemaProgress = useSelector(
    (rootState: RootState) => rootState.runnerResult.schemaProgress
  );
  const selectedSchema = useSelector(
    (rootState: RootState) => rootState.runnerResult.selectedSchema
  );
  const schemaResults = useSelector(
    (rootState: RootState) => rootState.runnerResult.schemaResults
  );

  const dispatch = useDispatch();

  const schemaHasError = useCallback(
    (schemaResult?: ScanSchemaResult) =>
      schemaResult?.queryResults.reduce(
        (pre, cur) => pre || cur?.results.error != null,
        false
      ) || false,
    []
  );

  const getSchemaProgress = useCallback(
    (result?: ScanSchemaResult, progress?: [ScanProcess, ScanProcess]) => {
      const fromResults = result?.queryResults.reduce(
        (pre, cur) => {
          if (cur == null) {
            return pre;
          }
          return [
            Math.max(pre[0], cur.progress.finished),
            Math.max(pre[1], cur.progress.total)
          ];
        },
        [0, 0]
      );
      const fromProgress = progress?.reduce(
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
          Math.max(fromResults[1], fromProgress[1])
        ];
      }
    },
    []
  );

  const schemas = useMemo(() => {
    const fromProgress = Object.keys(schemaProgress);
    const fromResults = Object.keys(schemaResults);
    const schemas = fromProgress.map((schmea) => schmea.toLowerCase());
    fromResults.forEach((schema) => {
      const schema_lower = schema.toLowerCase();
      if (schemas.indexOf(schema_lower) === -1) {
        schemas.push(schema_lower);
      }
    });
    return schemas.sort();
  }, [schemaProgress, schemaResults]);

  const isSchemaRunning = useCallback(
    (schemaResult?: ScanSchemaResult) => {
      if (!isRunning) {
        return false;
      }

      return (
        schemaResult?.queryResults.reduce(
          (pre, cur) => pre || cur?.results == null,
          false
        ) || false
      );
    },
    [isRunning]
  );

  const IconRenderer = useCallback((isRunning, hasError, progress, hasDiff) => {
    if (isRunning) {
      return <CircularProgress size={20} variant='static' value={progress} />;
    }
    if (hasError) {
      return <ErrorIcon style={{ color: red[500] }} fontSize='small' />;
    }
    if (progress === 100 && !hasDiff) {
      return <CheckCircleIcon style={{ color: green[500] }} fontSize='small' />;
    }
    return <WarningIcon fontSize='small' style={{ color: orange[500] }} />;
  }, []);

  const schemaMenuItems = useMemo(() => {
    return schemas.map((schema) => {
      const result = schemaResults[schema];
      const progress = schemaProgress[schema];

      const isRunning = isSchemaRunning(result);
      const hasError = schemaHasError(result);
      const hasDiff = Object.keys(result.diffResults || {}).length > 0;
      const [finished, total] = getSchemaProgress(result, progress);

      return (
        <MenuItem dense key={schema} value={schema}>
          <LabelWithIcon
            Icon={() =>
              IconRenderer(
                isRunning,
                hasError,
                (finished / total) * 100,
                hasDiff
              )
            }
          >
            {schema}
          </LabelWithIcon>
        </MenuItem>
      );
    });
  }, [
    IconRenderer,
    getSchemaProgress,
    isSchemaRunning,
    schemaHasError,
    schemaProgress,
    schemaResults,
    schemas
  ]);

  const handleChange = useCallback(
    (e) => {
      const { value } = e.target;
      dispatch(setSelectedSchema(value));
    },
    [dispatch]
  );
  return (
    <Select
      autoWidth
      value={selectedSchema}
      onChange={handleChange}
      variant='outlined'
      margin='dense'
    >
      {schemaMenuItems}
    </Select>
  );
};

export default SchemaSelect;
