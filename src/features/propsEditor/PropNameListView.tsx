import React, { useCallback } from "react";
import SearchBar from "../../components/SearchBar";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { RootState } from "../../reducers";
import {
  setPropName,
} from "./propsEditorSlice";
import { Resizable } from "re-resizable";
import { Divider, makeStyles, createStyles } from "@material-ui/core";
import PropNameList from "../../components/PropNameList";

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

const ClassSelectView = React.memo(() => {
  const dispatch = useDispatch();
  const selectedPropName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedPropName
  );
  const propNameList = useSelector(
    (rootState: RootState) => rootState.propsEditor.propNameList
  );
  const propsValidateMap = useSelector(
    (rootState: RootState) => {
      if (rootState?.propsEditor?.propsValidateMap) {
        return rootState?.propsEditor?.propsValidateMap[rootState.propsEditor?.selectedClassName]
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
