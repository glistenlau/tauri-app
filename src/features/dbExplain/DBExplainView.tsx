import React, { useState } from "react";
import styled from "styled-components";
import Editor from "../../components/Editor";
import TabContent from "../../components/TabContent";
import DBExplainTreeView from "./DBExplainTreeView";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: row;
`;

const EditorContainer = styled.div`
  width: 50%;
  height: 100%;
`;

const DBExplainView: React.FC = ({ active }) => {
  const [text, setText] = useState<string>();
  return (
    <Container active={active}>
      <EditorContainer>
        <Editor value={text} onChange={setText} />
      </EditorContainer>
      <DBExplainTreeView explainText={text || ""} />
    </Container>
  );
};

export default DBExplainView;
