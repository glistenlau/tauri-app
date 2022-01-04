import React, {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useContext,
} from "react";
import { useSelector } from "react-redux";
import SplitEditor, { SplitEditorHandle } from "../../components/SplitEditor";
import { useSavePropValsMutation } from "../../generated/graphql";
import { RootState } from "../../reducers";
import { PropsListContext } from "./PropsListView";

const SplitEditorView: ForwardRefRenderFunction<SplitEditorHandle, {}> = (
  {},
  ref
) => {
  const diffMode = useSelector(
    (rootState: RootState) => rootState.propsEditor.diffMode
  );
  const activePair = useSelector(
    (rootState: RootState) => rootState.propsEditor.activePair
  );
  const [savePropValues] = useSavePropValsMutation();
  const { selectedClass, selectedPropKey, propValues, setPropValues } =
    useContext(PropsListContext);
  const handleChange = useCallback(
    (valuePair: [string, string]) => {
      setPropValues({
        valuePair,
        validationError: propValues.validationError,
      });
    },
    [propValues.validationError, setPropValues]
  );

  const handleBlur = useCallback(async () => {
    savePropValues({
      variables: {
        className: selectedClass,
        propKey: selectedPropKey,
        propVals: propValues.valuePair,
      },
    });
  }, [propValues.valuePair, savePropValues, selectedClass, selectedPropKey]);

  return (
    <SplitEditor
      activePair={activePair}
      ref={ref}
      valuePair={propValues.valuePair as [string, string]}
      onBlur={handleBlur}
      onChange={handleChange}
      diff={diffMode}
    />
  );
};

export default memo(forwardRef(SplitEditorView));
