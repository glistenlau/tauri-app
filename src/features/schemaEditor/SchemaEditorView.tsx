import { createStyles, Divider, makeStyles } from "@material-ui/core";
import { Resizable } from "re-resizable";
import React, { useCallback } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import SearchBar from "../../components/SearchBar";
import SplitEditor from "../../components/SplitEditor";
import TabContent from "../../components/TabContent";
import { useDbSchemaSearchLazyQuery } from "../../generated/graphql";
import { RootState } from "../../reducers";
import {
  changeSearchFile,
  changeSearchPath,
  searchXmlFiles
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

const SchemaEditorView = React.memo(({ active }: SchemaEditorViewProps) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {
    activeNodeId,
    leftPanelWidth,
    searchPath,
    searchFile,
    valuePair,
    diffMode,
    xmlList,
    activePair,
  } = useSelector(
    (state: RootState) => ({
      leftPanelWidth: state.schemaEditor.leftPanelWidth,
      searchPath: state.schemaEditor.searchPath,
      searchFile: state.schemaEditor.searchFile,
      valuePair: state.schemaEditor.valuePair,
      diffMode: state.schemaEditor.diffMode,
      activeNodeId: state.schemaEditor.activeNodeId,
      xmlList: state.schemaEditor.xmlList,
      activePair: state.schemaEditor.activePair,
    }),
    shallowEqual
  );

  const [
    searchDbSchema,
    { called, loading, data },
  ] = useDbSchemaSearchLazyQuery();

  console.log("search db schema data", data);

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

  const handleBlur = React.useCallback(
    (newValuePair: [string, string]) => {
      const [newValOne, newValTwo] = newValuePair;
      const [oldValOne, oldValTwo] = valuePair;
      if (newValOne === oldValOne && newValTwo === oldValTwo) {
        return;
      }
      dispatch(changeValuePair(newValuePair));

      const xmlFileIndex = extractXmlFileIndex(activeNodeId);
      if (isNaN(xmlFileIndex) || xmlFileIndex >= xmlList.length) {
        return;
      }

      const newXmlFile =
        newValOne !== oldValOne
          ? saveTagValue(activeNodeId, newValOne, 0, xmlList[xmlFileIndex])
          : saveTagValue(activeNodeId, newValTwo, 1, xmlList[xmlFileIndex]);

      dispatch(setXmlFileTag({ xmlFile: newXmlFile, index: xmlFileIndex }));
    },
    [activeNodeId, dispatch, valuePair, xmlList]
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

  const handleSearch = React.useCallback(
    async (filePath: string, fileName: string) => {
      await dispatch(searchXmlFiles(filePath, fileName));
    },
    [dispatch]
  );

  return (
    <Container active={active}>
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
        <SchemaTreeView />
      </Resizable>
      <Divider orientation="vertical" flexItem />
      <div className={classes.rightContainer}>
        <SchemaTreeViewToolBar />
        <Divider />
        <SplitEditor
          baseValues={valuePair}
          onBlur={handleBlur}
          diff={diffMode}
          mode="xml"
          activePair={activePair}
        />
      </div>
    </Container>
  );
});

export default SchemaEditorView;
