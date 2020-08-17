import React, { useCallback } from "react";
import SearchBar from "../../components/SearchBar";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { RootState } from "../../reducers";
import { setPropName, setValuePair } from "./propsEditorSlice";
import { Resizable } from "re-resizable";
import { Divider, makeStyles, createStyles } from "@material-ui/core";
import SplitEditor from "../../components/SplitEditor";

const useStyles = makeStyles((theme) =>
  createStyles({
    leftContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
  })
);

const SplitEditorView = React.memo(() => {
  const dispatch = useDispatch();
  const valuePair = useSelector(
    (rootState: RootState) => rootState.propsEditor.valuePair
  );
  const diffMode = useSelector(
    (rootState: RootState) => rootState.propsEditor.diffMode
  );

  const handleBlur = useCallback(
    (valuePair: [string, string]) => {
      dispatch(setValuePair(valuePair));
    },
    [dispatch]
  );

  return (
    <SplitEditor
      baseValues={valuePair}
      onBlur={handleBlur}
      diff={diffMode}
    />
  );
});

export default SplitEditorView;
