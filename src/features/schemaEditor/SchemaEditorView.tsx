import { createStyles, Divider, makeStyles } from "@material-ui/core";
import { Resizable } from "re-resizable";
import React, { createContext, useCallback, useEffect, useMemo } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import SearchBar from "../../components/SearchBar";
import SplitEditor from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import {
  AppStateKey,
  DbFamily,
  FlatNode,
  FlatSchemaFile,
  Range,
  useDbSchemaFileContetQuery,
  useDbSchemaSearchFlatLazyQuery,
} from "../../generated/graphql";
import { useAppState } from "../../hooks/useAppState";
import { RootState } from "../../reducers";
import {
  changeLeftPanelWidth,
  changeSearchFile,
  changeSearchPath,
} from "./schemaEditorSlice";
import SchemaTreeView from "./SchemaTreeView";
import SchemaTreeViewToolBar from "./SchemaTreeViewToolBar";

const useStyles = makeStyles((theme) =>
  createStyles({
    leftContainer: {
      display: "flex",
      flexDirection: "column",
    },
    rightContainer: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "10%",
    },
  })
);

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: flex;
  flex-direction: row;
`;
interface SchemaEditorViewProps {
  active: boolean;
}

interface SchemaEditorContextType {
  onSelectNode: (id: string) => void;
}
export const SchemaEditorContext = createContext<SchemaEditorContextType>({
  onSelectNode: (id) => {},
});

const SchemaEditorView = React.memo(({ active }: SchemaEditorViewProps) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { leftPanelWidth, searchPath, searchFile, diffMode, activePair } =
    useSelector(
      (state: RootState) => ({
        leftPanelWidth: state.schemaEditor.leftPanelWidth,
        searchPath: state.schemaEditor.searchPath,
        searchFile: state.schemaEditor.searchFile,
        diffMode: state.schemaEditor.diffMode,
        activeNodeId: state.schemaEditor.activeNodeId,
        activePair: state.schemaEditor.activePair,
      }),
      shallowEqual
    );

  const [selectedNode, setSelectedNode] = useAppState<FlatNode | undefined>(
    AppStateKey.SchemaEditorSelectedNode,
    undefined
  );
  const [selectedFilePath, setSelectedFilePath] = useAppState<string>(
    AppStateKey.SchemaEditorSelectedFilePath,
    ""
  );

  const contentRanges = useMemo<Range[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const { values } = selectedNode;

    return values.map((val) => ({ start: val.start, end: val.end }));
  }, [selectedNode]);

  const [treeNode, setTreeNode] = useAppState<
    Array<FlatSchemaFile> | undefined
  >(AppStateKey.SchemaEditorTreeNode, undefined);

  const { data: contentData } = useDbSchemaFileContetQuery({
    variables: { filePath: selectedFilePath || "", ranges: contentRanges },
  });

  const valuePair = useMemo(() => {
    if (
      !selectedNode ||
      !contentData ||
      contentData.dbSchemaFileContent.length === 0
    ) {
      return ["", ""];
    }
    const { values } = selectedNode;

    const res = ["", ""];

    values.forEach((val, index) => {
      if (val.dbFamily === DbFamily.Postgres) {
        res[1] = contentData.dbSchemaFileContent[index];
      } else {
        res[0] = contentData.dbSchemaFileContent[index];
      }
    });

    return res;
  }, [contentData, selectedNode]);

  const [searchDbSchema, { called, loading, data, error }] =
    useDbSchemaSearchFlatLazyQuery();

  useEffect(() => {
    if (data?.dbSchemasFlat) {
      setTreeNode(data?.dbSchemasFlat);
    }
  }, [data?.dbSchemasFlat, setTreeNode]);

  const onNodeSelect = useCallback(
    (id: string) => {
      if (!treeNode || !id) {
        return;
      }

      const fileIndex = parseInt(id.split("-")[0]);
      const selectedNode = treeNode[fileIndex].nodes.find(
        (node) => node.id === id
      );
      setSelectedNode(selectedNode);
      setSelectedFilePath(treeNode[fileIndex].path);
    },
    [setSelectedFilePath, setSelectedNode, treeNode]
  );

  const handleClickSearch = useCallback(() => {
    searchDbSchema({
      variables: {
        searchFolder: searchPath,
        searchPattern: searchFile,
      },
    });
  }, [searchDbSchema, searchFile, searchPath]);

  const handleLeftPanelResize = useCallback(
    (e: any, direction: any, ref: any, d: any) => {
      const width = leftPanelWidth + d.width;
      dispatch(changeLeftPanelWidth(width));
    },
    [dispatch, leftPanelWidth]
  );

  const handleSearchPathChange = React.useCallback(
    (searchPath: string) => {
      dispatch(changeSearchPath(searchPath));
    },
    [dispatch]
  );

  const handleSearchFileChange = React.useCallback(
    (searchFile: string) => {
      dispatch(changeSearchFile(searchFile));
    },
    [dispatch]
  );

  return (
    <Container active={active}>
      <SchemaEditorContext.Provider value={{ onSelectNode: onNodeSelect }}>
        <Resizable
          className={classes.leftContainer}
          onResizeStop={handleLeftPanelResize}
          size={{
            height: "100%",
            width: leftPanelWidth,
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
          <SearchBar
            searchFolderLabel="SearchFolder"
            searchFileLabel="Schema XML"
            filePathValue={searchPath}
            fileNameValue={searchFile}
            onFilePathChange={handleSearchPathChange}
            onFileNameChange={handleSearchFileChange}
            onSearch={handleClickSearch}
            isLoading={loading}
          />
          <Divider style={{ marginTop: 10 }} />
          {treeNode && (
            <SchemaTreeView
              treeData={treeNode}
              selectedNodeId={selectedNode?.id}
            />
          )}
        </Resizable>
        <Divider orientation="vertical" flexItem />
        <div className={classes.rightContainer}>
          <SchemaTreeViewToolBar />
          <Divider />
          <SplitEditor
            valuePair={valuePair as [string, string]}
            diff={diffMode}
            mode="xml"
            activePair={activePair}
          />
        </div>
      </SchemaEditorContext.Provider>
    </Container>
  );
});

export default SchemaEditorView;
