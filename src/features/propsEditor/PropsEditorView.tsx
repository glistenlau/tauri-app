import Divider from "@material-ui/core/Divider";
import { useSnackbar } from "notistack";
import React, {
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import JavaPropsApi from "../../apis/javaProps";
import SaveDialog from "../../components/SaveDialog";
import { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import {
  Maybe,
  PropKey,
  useFormatSqlLazyQuery,
  useGetCurrentJavaPropsStateQuery,
  useSelectClassMutation,
  useSelectPropKeyMutation
} from "../../generated/graphql";
import { loadQueryScan } from "../queryScan/queryScanSlice";
import EditorToolBarView from "./EditorToolBarView";
import PathBarView from "./PathBarView";
import { updateParamValuePair } from "./propsEditorSlice";
import PropsListView, { PropsListContext } from "./PropsListView";
import SplitEditorView from "./SplitEditorView";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: column;
`;

const EditorContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  height: 40%;
  width: 100%;
`;

const RightContainer = styled.div`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  width: 10%;
`;
interface PropsEditorViewProps {
  active: boolean;
  className?: string;
}

const PropsEditorView: React.FC<PropsEditorViewProps> = ({ active }) => {
  const splitEditorRef: null | RefObject<SplitEditorHandle> = useRef(null);
  const [openSaveDialog, setOptionSaveDialog] = useState(false);
  const snackbar = useSnackbar();
  const dispatch = useDispatch();
  const [classList, setClassList] = useState<Array<string>>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedPropKey, setSelectedPropKey] = useState("");
  const [propKeyList, setPropKeyList] = useState<Array<PropKey>>([]);
  const [propValues, setPropValues] = useState<[string, string]>(["", ""]);
  const { data } = useGetCurrentJavaPropsStateQuery();

  const setPropsEditorState = useCallback(
    (
      classList?: Maybe<string[]>,
      selectedClass?: Maybe<string>,
      selectedPropKey?: Maybe<string>,
      propKeyList?: Maybe<Array<PropKey>>,
      propVals?: Maybe<[string, string]>
    ) => {
      setClassList(classList || []);
      setSelectedClass(selectedClass || "");
      setSelectedPropKey(selectedPropKey || "");
      setPropKeyList(propKeyList || []);
      setPropValues((propVals as [string, string] | undefined) || ["", ""]);
    },
    []
  );

  useEffect(() => {
    if (!data) {
      return;
    }
    const { classList, selectedClass, selectedPropKey, propKeyList, propVals } =
      data.currentJavaPropsState;

    setPropsEditorState(
      classList,
      selectedClass,
      selectedPropKey,
      propKeyList,
      propVals as Maybe<[string, string]>
    );
  }, [data, setPropsEditorState]);

  const [selectClassMutation] = useSelectClassMutation();
  const selectClass = useCallback(
    async (path: string) => {
      setSelectedClass(path);
      const { data } = await selectClassMutation({
        variables: { className: path },
      });
      if (!data) {
        return;
      }
      const { propKeyList, propVals } = data.selectClass;
      const selectedPropKey =
        propKeyList == null || propKeyList.length === 0
          ? ""
          : propKeyList[0].name;
      setPropKeyList(propKeyList || []);
      setSelectedPropKey(selectedPropKey);
      setPropValues((propVals as [string, string] | undefined) || ["", ""]);
    },
    [selectClassMutation]
  );

  const [selectPropKeyMutation] = useSelectPropKeyMutation();
  const selectPropKey = useCallback(
    async (propName: string) => {
      setSelectedPropKey(propName);
      const { data } = await selectPropKeyMutation({
        variables: { className: selectedClass, propKey: propName },
      });
      if (!data) {
        return;
      }
      const { propVals } = data.selectPropKey;
      setPropValues((propVals as [string, string] | undefined) || ["", ""]);
    },
    [selectPropKeyMutation, selectedClass]
  );

  const [formatSql] = useFormatSqlLazyQuery();

  const handleClickFormat = useCallback(async () => {
    const values = splitEditorRef.current?.getEditorValues();
    if (!values) {
      return;
    }

    const formatRst = await formatSql({
      variables: { sqlStmts: values },
    });
    if (!formatRst.data) {
      return;
    }

    const formated = formatRst.data.formatSql as [string, string];

    dispatch(updateParamValuePair(formated));
  }, [dispatch, formatSql]);

  const handleClickRun = useCallback(async () => {
    const values = splitEditorRef.current?.getEffectiveValue();
    if (!values || values.filter((value) => value.length === 0).length === 2) {
      snackbar.enqueueSnackbar("There is no query to run.", {
        variant: "warning",
      });
      return;
    }
    await dispatch(loadQueryScan(values));
  }, [dispatch, snackbar]);

  const handleClickSave = useCallback(() => {
    setOptionSaveDialog(true);
  }, []);

  const handleSaveDialogClose = useCallback(
    async (value?: number) => {
      if (value == null) {
        setOptionSaveDialog(false);
      }

      const valuePair = splitEditorRef.current?.getEditorValues();
      if (valuePair == null) {
        snackbar.enqueueSnackbar("Editor not found.", { variant: "error" });
        setOptionSaveDialog(false);
        return;
      }

      if (value === 0 || value === 2) {
        try {
          const filepath = `${selectedClass}.pg.properties`;
          const prop_value = valuePair[1];
          await JavaPropsApi.saveProp(filepath, selectedPropKey, prop_value);
          snackbar.enqueueSnackbar(
            `Save Postgres property ${selectedPropKey} successfully.`,
            { variant: "success" }
          );
        } catch (e) {
          snackbar.enqueueSnackbar("Save Postgres properties file failed.", {
            variant: "error",
          });
        }
      }
      if (value === 1 || value === 2) {
        try {
          const filepath = `${selectedClass}.oracle.properties`;
          const prop_value = valuePair[0];
          await JavaPropsApi.saveProp(filepath, selectedPropKey, prop_value);
          snackbar.enqueueSnackbar(
            `Save Oracle property ${selectedPropKey} successfully.`,
            { variant: "success" }
          );
        } catch (e) {
          snackbar.enqueueSnackbar("Save Postgres properties file failed.", {
            variant: "error",
          });
        }
      }

      setOptionSaveDialog(false);
    },
    [selectedClass, selectedPropKey, snackbar]
  );

  return (
    <Container active={active}>
      <EditorContainer>
        <PropsListContext.Provider
          value={{
            classList,
            setClassList,
            selectedClass,
            selectClass,
            selectedPropKey,
            selectPropKey,
            propKeyList,
            propValues,
            setPropValues,
            setPropsEditorState,
          }}
        >
          <PropsListView />
          <Divider orientation="vertical" flexItem />

          <RightContainer>
            <EditorToolBarView
              onClickFormat={handleClickFormat}
              onClickSave={handleClickSave}
              onClickRun={handleClickRun}
            />
            <Divider />
            <PathBarView />
            <Divider />
            <SplitEditorView ref={splitEditorRef} />
          </RightContainer>
        </PropsListContext.Provider>
      </EditorContainer>
      <SaveDialog
        id="save_dialog"
        keepMounted
        value={0}
        open={openSaveDialog}
        onClose={handleSaveDialogClose}
        error={null}
        propName={selectedPropKey}
      />
    </Container>
  );
};

export default PropsEditorView;
