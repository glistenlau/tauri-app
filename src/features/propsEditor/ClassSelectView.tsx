import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClassSelect from "../../components/ClassSelect";
import { RootState } from "../../reducers";
import { setClassPath } from "./propsEditorSlice";

const ClassSelectView = React.memo(() => {
  const dispatch = useDispatch();
  const selectedClassName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedClassName
  );
  const classNameList = useSelector(
    (rootState: RootState) => rootState.propsEditor.classNameList
  );

  const handleChange = useCallback(
    (path: string) => {
      dispatch(setClassPath(path));
    },
    [dispatch]
  );

  return (
    <ClassSelect
      onChange={handleChange}
      selected={selectedClassName}
      values={classNameList}
    />
  );
});

export default ClassSelectView;
