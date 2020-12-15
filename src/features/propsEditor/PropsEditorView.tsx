import Divider from "@material-ui/core/Divider";
import { useSnackbar } from "notistack";
import React, { RefObject, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { SplitEditorHandle } from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { initQueryScan } from "../queryScan/queryScanSlice";
import EditorToolBarView from "./EditorToolBarView";
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
  const snackbar = useSnackbar();
  const dispatch = useDispatch();

  const handleClickRun = useCallback(async () => {
    const values = splitEditorRef.current?.getEffectiveValue();
    if (!values || values.filter(value => value.length === 0).length === 2) {
      snackbar.enqueueSnackbar("There is no query to run.", { variant: 'warning' });
      return;
    }
    await dispatch(initQueryScan(values));
  }, [dispatch, snackbar]);

  return (
    <Container active={active}>
      <EditorContainer>
        <PropsListView />
        <Divider orientation="vertical" flexItem />

        <RightContainer>
          <EditorToolBarView onClickRun={handleClickRun} />
          <Divider />
          <SplitEditorView ref={splitEditorRef} />
        </RightContainer>
      </EditorContainer>
    </Container>
  );
};

export default PropsEditorView;