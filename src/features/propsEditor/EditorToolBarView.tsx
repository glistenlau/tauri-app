import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import queryRunner from "../../apis/queryRunner";
import EditorToolBar from "../../components/EditorToolBar";
import { RootState } from "../../reducers";

const EditorToolBarView = () => {
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

  const handleClickRun = useCallback(async () => {
    const result = await queryRunner.getAllSchemas();
    console.log(result);
  }, []);

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
