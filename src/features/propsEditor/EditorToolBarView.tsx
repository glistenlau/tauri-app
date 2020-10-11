import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import EditorToolBar from "../../components/EditorToolBar";
import { RootState } from "../../reducers";
import { setOpenModal } from "../queryScan/queryScanSlice";

const EditorToolBarView = () => {
  const dispatch = useDispatch();
  const propsValidateMap = useSelector(
    (rootState: RootState) => rootState.propsEditor.propsValidateMap
  );
  const selectedClassName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedClassName
  );
  const selectedPropName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedPropName
  );

  const propValidateResult = useMemo(() => {
    if (!propsValidateMap || !selectedClassName || !selectedPropName) {
      return;
    }

    const selectedProps = propsValidateMap[selectedClassName] ?? {};
    return selectedProps[selectedPropName];
  }, [propsValidateMap, selectedClassName, selectedPropName]);

  const handleClickRun = useCallback(() => {
    dispatch(setOpenModal(true));
  }, [dispatch]);

  return (
    <EditorToolBar
      diff={false}
      onClickCopy={() => {}}
      onClickFormat={() => {}}
      onClickDiff={() => {}}
      onClickRun={handleClickRun}
      onClickSave={() => {}}
      validateResult={propValidateResult}
    />
  );
};

export default EditorToolBarView;
