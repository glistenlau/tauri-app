import React, { useCallback } from "react";
import SearchBar from "../../components/SearchBar";
import { useSelector, useDispatch, shallowEqual } from "react-redux";
import { RootState } from "../../reducers";
import { setClassName, setFilePath, searchProps, setWidth } from "./propsEditorSlice";
import { Resizable } from "re-resizable";
import { Divider, makeStyles, createStyles } from "@material-ui/core";
import PropNameList from "../../components/PropNameList";
import ClassSelect from "../../components/ClassSelect";
import PropsSearchView from "./PropsSearchView";
import ClassSelectView from "./ClassSelectView";
import PropNameListView from "./PropNameListView";

const useStyles = makeStyles((theme) =>
  createStyles({    
    leftContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
  }));;

const PropsEditorView = React.memo(() => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const panelWidth = useSelector(
    (rootState: RootState) => rootState.propsEditor.panelWidth
  );
  const handlePanelResize = useCallback((e: any, direction: any, ref: any, d: any) => {
    const width = panelWidth + d.width;
    dispatch(setWidth(width));
  }, [dispatch, panelWidth])

  return (
    <Resizable
      className={classes.leftContainer}
      onResizeStop={handlePanelResize}
      size={{
        height: "100%",
        width: panelWidth,
      }}
      minWidth={200}
      maxWidth="40vw"
      enable={{
        top: false,
        right: true,
        bottom: false,
        left: false,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
    >
      <PropsSearchView />
      <ClassSelectView/>
      <Divider />
      <PropNameListView />
    </Resizable>
  );
});

export default PropsEditorView;
