import { createStyles, Divider, makeStyles } from "@material-ui/core";
import { Resizable } from "re-resizable";
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PropKey, useGetCurrentJavaPropsStateQuery, useSearchJavaPropsMutation } from "../../generated/graphql";
import { RootState } from "../../reducers";
import ClassSelectView from "./ClassSelectView";
import PropNameListView from "./PropNameListView";
import { setWidth } from "./propsEditorSlice";
import PropsSearchView from "./PropsSearchView";

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

interface IPropsListContext {
  classList: Array<string>;
  setClassList: (classList: Array<string>) => void;
  selectedClass: string;
  setSelectedClass: (selectedClass: string) => void;
  selectedPropKey: string;
  setSelectedPropKey: (selectedPropKey: string) => void;
  propKeyList: Array<PropKey>;
  setPropKeyList: (propKeyList: Array<PropKey>) => void;
  propValues: [string, string];
  setPropValues: (propValues: [string, string]) => void;
}


export const PropsListContext = React.createContext<IPropsListContext>({
  classList: [],
  setClassList: (classList: Array<string>) => { },
  selectedClass: "",
  setSelectedClass: (selectedClass: string) => { },
  selectedPropKey: "",
  setSelectedPropKey: (selectedPropKey: string) => { },
  propKeyList: [],
  setPropKeyList: (propKeyList: Array<PropKey>) => { },
  propValues: ["", ""],
  setPropValues: (propValues: [string, string]) => { },
});

const PropsListView = React.memo(() => {
  const [classList, setClassList] = useState<Array<string>>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedPropKey, setSelectedPropKey] = useState("");
  const [propKeyList, setPropKeyList] = useState<Array<PropKey>>([]);
  const [propValues, setPropValues] = useState<[string, string]>(["", ""]);
  const { data } = useGetCurrentJavaPropsStateQuery();

  useEffect(() => {
    if (!data) {
      return;
    }
    const { classList, selectedClass, selectedPropKey, propKeyList, propVals } = data?.currentJavaPropsState;
    setClassList(classList || []);
    setSelectedClass(selectedClass || "");
    setSelectedPropKey(selectedPropKey || "");
    setPropKeyList(propKeyList || []);
    setPropValues(propVals || ["", ""])
  }, [data]);

  const classes = useStyles();
  const dispatch = useDispatch();
  const panelWidth = useSelector(
    (rootState: RootState) => rootState.propsEditor.panelWidth
  );



  const handlePanelResize = useCallback(
    (e: any, direction: any, ref: any, d: any) => {
      const width = panelWidth + d.width;
      dispatch(setWidth(width));
    },
    [dispatch, panelWidth]
  );

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
      <PropsListContext.Provider value={{
        classList,
        setClassList,
        selectedClass,
        setSelectedClass,
        selectedPropKey,
        setSelectedPropKey,
        propKeyList,
        setPropKeyList,
        propValues,
        setPropValues,
      }}>
        <PropsSearchView />
        <ClassSelectView />
        <Divider />
        <PropNameListView />
      </PropsListContext.Provider>
    </Resizable >
  );
});

export default PropsListView;
