import Divider from "@material-ui/core/Divider";
import { useSnackbar } from "notistack";
import React, { RefObject, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import JavaPropsApi from "../../apis/javaProps";
import SaveDialog from "../../components/SaveDialog";
import { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { useFormatSqlLazyQuery } from "../../generated/graphql";
import { RootState } from "../../reducers";
import { loadQueryScan } from "../queryScan/queryScanSlice";
import EditorToolBarView from "./EditorToolBarView";
import PathBarView from "./PathBarView";
import { updateParamValuePair } from "./propsEditorSlice";
import PropsListView from "./PropsListView";
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

  const selectedClassName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedClassName
  );

  const selectedPropName = useSelector(
    (rootState: RootState) => rootState.propsEditor.selectedPropName
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
  }, [dispatch]);

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
          const filepath = `${selectedClassName}.pg.properties`;
          const prop_value = valuePair[1];
          await JavaPropsApi.saveProp(filepath, selectedPropName, prop_value);
          snackbar.enqueueSnackbar(
            `Save Postgres property ${selectedPropName} successfully.`,
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
          const filepath = `${selectedClassName}.oracle.properties`;
          const prop_value = valuePair[0];
          await JavaPropsApi.saveProp(filepath, selectedPropName, prop_value);
          snackbar.enqueueSnackbar(
            `Save Oracle property ${selectedPropName} successfully.`,
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
    [selectedClassName, selectedPropName, snackbar]
  );

  return (
    <Container active={active}>
      <EditorContainer>
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
      </EditorContainer>
      <SaveDialog
        id="save_dialog"
        keepMounted
        value={0}
        open={openSaveDialog}
        onClose={handleSaveDialogClose}
        error={null}
        propName={selectedPropName}
      />
    </Container>
  );
};

export default PropsEditorView;
