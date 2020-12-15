import React, { forwardRef, ForwardRefRenderFunction, memo, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SplitEditor, { SplitEditorHandle } from "../../components/SplitEditor";
import { RootState } from "../../reducers";
import { updateParamValuePair } from "./propsEditorSlice";


const SplitEditorView: ForwardRefRenderFunction<SplitEditorHandle, {}> = ({ }, ref) => {
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
  const activePair = useSelector(
    (rootState: RootState) => rootState.propsEditor.activePair
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
  }, [propsMap, selectedClassName, selectedPropName])

  const handleChange = useCallback(
    (valuePair: [string, string]) => {
      setValuePair(valuePair);
    },
    []
  );

  const handleBlur = useCallback(() => {
    dispatch(updateParamValuePair(valuePair));
  }, [dispatch, valuePair]);

  return (
    <SplitEditor
      activePair={activePair}
      ref={ref}
      valuePair={valuePair}
      onBlur={handleBlur}
      onChange={handleChange}
      diff={diffMode}
    />
  );
};

export default memo(forwardRef(SplitEditorView));
