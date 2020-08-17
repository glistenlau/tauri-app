import React, { useCallback } from "react";
import SearchBar from "../../components/SearchBar";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { RootState } from "../../reducers";
import { setClassName, setFilePath, searchProps, setWidth, setClassPath } from "./propsEditorSlice";
import { Resizable } from "re-resizable";
import { Divider, makeStyles, createStyles } from "@material-ui/core";
import ClassSelect from "../../components/ClassSelect";

const useStyles = makeStyles((theme) =>
  createStyles({    
    leftContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
  }));;

const ClassSelectView = React.memo(() => {
  const dispatch = useDispatch();
  const selectedClassName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedClassName
  );
  const classNameList = useSelector(
    (rootState: RootState) => rootState.propsEditor.classNameList
  );

  const handleChange = useCallback((path: string) => {
    dispatch(setClassPath(path));
  },[dispatch])


  return (
      <ClassSelect
        onChange={handleChange}
        selected={selectedClassName}
        values={classNameList}
      />
  );
});

export default ClassSelectView;
