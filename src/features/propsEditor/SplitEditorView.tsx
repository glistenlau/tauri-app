import React, {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useContext,
  useRef,
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
  const valuePairRef = useRef(propValues);

  const handleChange = useCallback(
    (valuePair: [string, string]) => {
      setPropValues(valuePair);
      valuePairRef.current = valuePair;
    },
    [setPropValues]
  );

  const handleBlur = useCallback(async () => {
    savePropValues({
      variables: {
        className: selectedClass,
        propKey: selectedPropKey,
        propVals: valuePairRef.current,
      },
    });
  }, [savePropValues, selectedClass, selectedPropKey]);

  return (
    <SplitEditor
      activePair={activePair}
      ref={ref}
      valuePair={propValues}
      onBlur={handleBlur}
      onChange={handleChange}
      diff={diffMode}
    />
  );
};

export default memo(forwardRef(SplitEditorView));
