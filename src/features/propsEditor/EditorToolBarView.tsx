import React, { useCallback, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SQLError } from "../../apis/sqlCommon";
import EditorToolBar from "../../components/EditorToolBar";
import { RootState } from "../../reducers";
import { setActivePair, setDiffMode } from "./propsEditorSlice";
import { PropsListContext } from "./PropsListView";

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
  const diffMode = useSelector(
    (rootState: RootState) => rootState.propsEditor.diffMode
  );
  const activePair = useSelector(
    (rootState: RootState) => rootState.propsEditor.activePair
  );
  const { propValues, selectClass, selectPropKey } =
    useContext(PropsListContext);

  const handleClickDiff = useCallback(
    (e, checked) => {
      dispatch(setDiffMode(checked));
    },
    [dispatch]
  );

  const handleActivePairChange = useCallback(
    (activePair: [boolean, boolean]) => {
      dispatch(setActivePair(activePair));
    },
    [dispatch]
  );

  return (
    <EditorToolBar
      activePair={activePair}
      diff={diffMode}
      onActivePairChange={handleActivePairChange}
      onClickCopy={() => {}}
      onClickFormat={onClickFormat}
      onClickDiff={handleClickDiff}
      onClickRun={onClickRun}
      onClickSave={onClickSave}
      showEditorIcons={selectClass.length > 0 && selectPropKey.length > 0}
      validateResult={propValues.validationError as [SQLError, SQLError]}
    />
  );
};

export default EditorToolBarView;
