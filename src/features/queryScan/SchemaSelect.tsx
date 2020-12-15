import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import QueryRunner from "../../apis/queryRunner";
import SchemaDropdown from "../../components/SchemaDropdown";
import { RootState } from "../../reducers";
import { setSchemas } from "../runnerControl/runnerControlSlice";
import { setActiveSchema, setSelectedSchemas } from "./queryScanSlice";

export interface SchemaSelectProps {
  className?: string;
}

const SchemaSelect = React.memo((props: SchemaSelectProps) => {
  const { className, ...others } = props;
  const selectedSchemas = useSelector(
    (state: RootState) => state.queryScan.selectedSchemas
  );

  const activeSchema = useSelector(
    (state: RootState) => state.queryScan.activeSchema
  );

  const dispatch = useDispatch();
  const schemas = useSelector(
    (state: RootState) => state.runnerControl.schemas
  );

  const fetchSchemas = useCallback(
    async ()=> {
      const schemas = await QueryRunner.getAllSchemas();
      const filteredSelected = selectedSchemas.filter(
        (schema) =>
          schemas[0].findIndex((s) => s.toLowerCase() === schema) > -1 ||
          schemas[1].findIndex((s) => s.toLowerCase() === schema) > -1
      );
      if (filteredSelected.indexOf(activeSchema) === -1 && filteredSelected.length > 0) {
        dispatch(setActiveSchema(filteredSelected[0]));
      }
      dispatch(setSchemas(schemas));
      dispatch(setSelectedSchemas(filteredSelected));
    },
    [activeSchema, dispatch, selectedSchemas]
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
      onClickRefresh={fetchSchemas}
    />
  );
});

export default SchemaSelect;
