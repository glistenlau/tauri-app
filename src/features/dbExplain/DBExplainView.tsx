import React, { useState } from "react";
import styled from "styled-components";
import Editor from "../../components/Editor";
import TabContent from "../../components/TabContent";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: row;
`;

const EditorContainer = styled.div`
  width: 50%;
  height: 100%;
`;

interface DBExplainProps {
  active: boolean;
}

const DBExplainView: React.FC<DBExplainProps> = ({ active }) => {
  const [text, setText] = useState<string>();
  return (
    <Container active={active}>
      <EditorContainer>
        <Editor value={text} onChange={setText} />
      </EditorContainer>
      {/* <DBExplainTreeView explainText={text || ""} /> */}
    </Container>
  );
};

export default DBExplainView;
