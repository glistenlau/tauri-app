import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import EditorToolBar from "../../components/EditorToolBar";
import { RootState } from "../../reducers";
import { setActivePair, setDiffMode } from "./propsEditorSlice";

interface EditorToolBarViewProps {
  onClickFormat: () => void;
  onClickRun: () => any;
  onClickSave: () => void;
}

const EditorToolBarView: React.FC<EditorToolBarViewProps> = ({
  onClickFormat,
  onClickRun,
  onClickSave,
}) => {
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
  const diffMode = useSelector(
    (rootState: RootState) => rootState.propsEditor.diffMode
  );
  const activePair = useSelector(
    (rootState: RootState) => rootState.propsEditor.activePair
  );


  const propValidateResult = useMemo(() => {
    if (!propsValidateMap || !selectedClassName || !selectedPropName) {
      return;
    }

    const selectedProps = propsValidateMap[selectedClassName] ?? {};
    return selectedProps[selectedPropName];
  }, [propsValidateMap, selectedClassName, selectedPropName]);

  const handleClickDiff = useCallback((e, checked) => {
    dispatch(setDiffMode(checked));
  }, [dispatch])

  const handleActivePairChange = useCallback((activePair: [boolean, boolean]) => {
    dispatch(setActivePair(activePair));
  }, [dispatch])

  return (
    <EditorToolBar
      activePair={activePair}
      diff={diffMode}
      onActivePairChange={handleActivePairChange}
      onClickCopy={() => { }}
      onClickFormat={onClickFormat}
      onClickDiff={handleClickDiff}
      onClickRun={onClickRun}
      onClickSave={onClickSave}
      showEditorIcons={selectedClassName.length > 0 && selectedPropName.length > 0}
      validateResult={propValidateResult}
    />
  );
};

export default EditorToolBarView;
