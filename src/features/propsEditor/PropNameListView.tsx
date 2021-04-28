import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropNameList from "../../components/PropNameList";
import { RootState } from "../../reducers";
import {
  setPropName
} from "./propsEditorSlice";

const ClassSelectView = React.memo(() => {
  const dispatch = useDispatch();
  const selectedPropName = useSelector((rootState: RootState) => rootState.propsEditor.selectedPropName)
  const propNameList = useSelector(
    (rootState: RootState) => rootState.propsEditor.propNameList
  );
  const propsValidateMap = useSelector(
    (rootState: RootState) => {
      if (rootState?.propsEditor?.propsValidateMap) {
        return rootState?.propsEditor?.propsValidateMap[rootState.propsEditor?.listSelectedClassName]
      }
    }
  )

  const handleClickPropName = useCallback(
    (propName: string) => {
      dispatch(setPropName(propName));
    },
    [dispatch]
  );

  return (
    <PropNameList
      propNameList={propNameList}
      selectedProp={selectedPropName}
      onListItemClick={handleClickPropName}
      validateResults={propsValidateMap}
    />
  );
});

export default ClassSelectView;
