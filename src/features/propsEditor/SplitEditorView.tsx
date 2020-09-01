import React, { useCallback, useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../reducers";
import { updateParamValuePair } from "./propsEditorSlice";
import { makeStyles, createStyles } from "@material-ui/core";
import SplitEditor from "../../components/SplitEditor";


const SplitEditorView = React.memo(() => {
  const dispatch = useDispatch();
  const [valuePair, setValuePair] = useState(["", ""] as [string, string]);
  const propsMap = useSelector(
    (rootState: RootState) => rootState.propsEditor.propsMap
  );
  const selectedClassName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedClassName
  );
  const selectedPropName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedPropName
  );
  const diffMode = useSelector(
    (rootState: RootState) => rootState.propsEditor.diffMode
  );

  useEffect(() => {
    if (!propsMap || !selectedClassName || !selectedPropName) {
      return;
    }

    const propNameMap = propsMap[selectedClassName] ?? {};
    if (!propNameMap[selectedPropName]) {
      return;
    }

    setValuePair(propNameMap[selectedPropName]);
  },[propsMap, selectedClassName, selectedPropName])

  const handleChange = useCallback(
    (valuePair: [string, string]) => {
      setValuePair(valuePair);
    },
    []
  );

  const handleBlur = useCallback(() => {
    dispatch(updateParamValuePair(valuePair));
  },[dispatch, valuePair]);

  return (
    <SplitEditor
      valuePair={valuePair}
      onBlur={handleBlur}
      onChange={handleChange}
      diff={diffMode}
    />
  );
});

export default SplitEditorView;
