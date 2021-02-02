// @ts-ignore
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initApp, showNotification } from "../../actions";
import { XmlTag } from "../../core/xmlParser";
import xmlProcessor, {
  aggregateSameNamePair,
  extractXmlFileIndex, FAMILY,


  getAncestors, XmlFile
} from "../../core/xmlProcessor";
import { AppThunk } from "../../reducers";


export interface SchemaEditorState {
  activePair: [boolean, boolean];
  valuePair: [string, string];
  leftPanelWidth: number;
  xmlList: dbSchemaSearchQueryResponse.dbSchemas;
  searchPath: string;
  searchFile: string;
  activeNodeId: string;
  activeNodePaths: Array<[XmlTag, XmlTag]>;
  diffMode: boolean;
  filterText: string;
  pathOpenMap: any;
}

const initialState: SchemaEditorState = {
  activePair: [true, true],
  leftPanelWidth: 200,
  valuePair: ["", ""],
  xmlList: [],
  searchPath: "",
  searchFile: "",
  activeNodeId: "",
  activeNodePaths: [],
  diffMode: false,
  filterText: "",
  pathOpenMap: {},
};

const schemaEditor = createSlice({
  name: "schemaEditor",
  initialState,
  reducers: {
    changeLeftPanelWidth(state, { payload }: PayloadAction<number>) {
      state.leftPanelWidth = payload;
    },
    changeValuePair(state, { payload }: PayloadAction<[string, string]>) {
      state.valuePair = payload;
    },
    changeSearchPath(state, { payload }: PayloadAction<string>) {
      state.searchPath = payload;
    },
    changeSearchFile(state, { payload }: PayloadAction<string>) {
      state.searchFile = payload;
    },
    changeFilterText(state, { payload }: PayloadAction<string>) {
      state.filterText = payload;
    },
    setActiveNodeId(state, { payload }: PayloadAction<string>) {
      state.activeNodeId = payload;
    },
    setActiveNodePaths(
      state,
      { payload }: PayloadAction<Array<[XmlTag, XmlTag]>>
    ) {
      state.activeNodePaths = payload;
    },
    loadXmlList(state, { payload }: PayloadAction<Array<XmlFile>>) {
      state.activeNodeId = initialState.activeNodeId;
      state.activeNodePaths = initialState.activeNodePaths;
      state.pathOpenMap = {};
      state.xmlList = payload;
      state.valuePair = initialState.valuePair;
    },
    setXmlFileTag(
      state,
      { payload }: PayloadAction<{ index: number; xmlFile: XmlFile }>
    ) {
      const { index, xmlFile } = payload;
      const newXmlList = [
        ...state.xmlList.slice(0, index),
        xmlFile,
        ...state.xmlList.slice(index + 1),
      ];
      state.xmlList = newXmlList;
    },
    toggleDiffMode(state) {
      state.diffMode = !state.diffMode;
    },
    toggleOpen(state, { payload }: PayloadAction<string>) {
      const wasOpen = state.pathOpenMap[payload] || false;
      state.pathOpenMap = Object.assign({}, state.pathOpenMap, {
        [payload]: !wasOpen,
      });
    },
    toggleActiveEditor(state, { payload }: PayloadAction<number>) {
      const newPair = [...state.activePair];
      newPair[payload] = !newPair[payload];
      state.activePair = [newPair[0], newPair[1]];
    },
    setActivePair(state, {payload}: PayloadAction<[boolean, boolean]>) {
      state.activePair = payload;
    },
    selectXmlNode(state, { payload }: PayloadAction<string>) {
      const id = payload;
      const rootIndex = extractXmlFileIndex(id);
      if (id === state.activeNodeId) {
        return;
      }
      let valuePair;
      let pathList: Array<[XmlTag, XmlTag]> = [];
      if (
        isNaN(rootIndex) ||
        rootIndex >= state.xmlList.length ||
        !state.xmlList[rootIndex]
      ) {
        valuePair = ["", ""];
      }

      if (state.xmlList[rootIndex]) {
        const { xmlData, pathValueMap } = state.xmlList[rootIndex];
        pathList = getAncestors(id, pathValueMap);
        if (!pathValueMap || !pathValueMap[id]) {
          valuePair = ["", ""];
        }

        if (!valuePair) {
          valuePair = pathValueMap[id].map((tag) => {
            if (!tag || tag.start === -1 || tag.end === -1) {
              return "";
            }
            if (tag.start < 0 || tag.end + 1 > xmlData.length) {
              return "";
            }
            return xmlData.substring(tag.start, tag.end + 1);
          });
        }
      }

      state.valuePair = [valuePair[0], valuePair[1]];
      state.activeNodeId = id;
      state.activeNodePaths = pathList;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initApp, (state) => {
      return Object.assign({}, initialState, state);
    });
  },
});

export const {
  changeFilterText,
  changeLeftPanelWidth,
  changeValuePair,
  loadXmlList,
  changeSearchPath,
  changeSearchFile,
  setActivePair,
  setActiveNodeId,
  setActiveNodePaths,
  setXmlFileTag,
  toggleDiffMode,
  toggleOpen,
  toggleActiveEditor,
  selectXmlNode,
} = schemaEditor.actions;

export default schemaEditor.reducer;

export const searchXmlFiles = (
  searchPath: string,
  searchFile: string
): AppThunk => async (dispatch) => {
  try {
    const resultList = await xmlProcessor.findAndProcessXMLFile(
      searchPath,
      searchFile
    );
    dispatch(loadXmlList(resultList));
  } catch (e) {
    dispatch(showNotification("Search and parse xml failed.", "error"));
  }
};

const replaceTargetNode = (node: XmlTag, targetNode: XmlTag) => {
  if (node === null || typeof node !== "object") {
    return null;
  }

  if (node.id === targetNode.id) {
    return targetNode;
  }

  const cloneNode = XmlTag.clone(node);

  cloneNode.children = node.children.map((childNode) =>
    replaceTargetNode(childNode, targetNode)
  );
  return cloneNode;
};

export const saveTagValue = (
  id: string,
  value: string,
  position: 0 | 1,
  xmlFile: XmlFile
): XmlFile => {
  const { rootNode, pathStatusMap, pathValueMap, xmlData } = xmlFile;
  const theOtherIndex = Math.abs(position - 1);

  const targetTag = pathValueMap[id][position];
  const theOtherTag = pathValueMap[id][theOtherIndex];

  const family =
    position === 1
      ? FAMILY.POSTGRES
      : pathStatusMap[id][0]
      ? FAMILY.ORACLE
      : FAMILY.NONE;

  const parentEndIndex = id.lastIndexOf("-<");
  const parentPath =
    parentEndIndex !== -1 ? id.substring(0, parentEndIndex) : id;

  const oldStart = targetTag === null ? theOtherTag.end + 1 : targetTag.start;
  const oldEnd = targetTag === null ? theOtherTag.end : targetTag.end;
  const newEnd = oldStart + value.length - 1;
  const delta = newEnd - oldEnd;

  let processed;
  let newTargetTagNode;
  try {
    processed = xmlProcessor.processXMLData(
      value,
      "root",
      parentPath,
      family,
      oldStart,
      position
    );

    if (processed.rootNode && processed.rootNode.children.length > 1) {
      throw new Error("Multiple roots found.");
    }
    newTargetTagNode = processed.rootNode.children[0];
  } catch (e) {
    const cloneNode =
      targetTag === null ? XmlTag.clone(theOtherTag) : XmlTag.clone(targetTag);

    if (cloneNode.attr.family) {
      delete cloneNode.attr.family;
    }

    cloneNode.setStart(oldStart);
    cloneNode.setEnd(newEnd);
    cloneNode.setId(id);

    const newValuePair: [XmlTag, XmlTag] = [null, null];
    const newStatusPair: [boolean, boolean] = [false, false];
    newValuePair[position] = cloneNode;
    newStatusPair[position] = pathStatusMap[id][position];
    processed = {
      pathValueMap: { [id]: newValuePair },
      pathStatusMap: { [id]: newStatusPair },
      rootNode: cloneNode,
      xmlData: value,
    };

    newTargetTagNode = cloneNode;
  }
  const newPathValueMap = processed.pathValueMap;
  const newPathStatusMap = processed.pathStatusMap;

  Object.keys(pathValueMap).forEach((pathKey) => {
    const valuePair = pathValueMap[pathKey];
    const newValuePair = valuePair.map((tagValue) => {
      if (tagValue === null) {
        return null;
      }
      const cloneNode = XmlTag.clone(tagValue);

      if (tagValue.start > oldEnd) {
        cloneNode.start += delta;
        cloneNode.end += delta;
      } else if (tagValue.end > oldEnd) {
        cloneNode.end += delta;
      }
      return cloneNode;
    });
    const newStatusPair = [
      pathStatusMap[pathKey][0],
      pathStatusMap[pathKey][1],
    ];

    if (pathKey.startsWith(id)) {
      newValuePair[position] =
        (newPathValueMap[pathKey] && newPathValueMap[pathKey][position]) ||
        null;
      newStatusPair[position] =
        (newPathStatusMap[pathKey] && newPathStatusMap[pathKey][position]) ||
        false;
    }

    if (newValuePair.some((val) => val != null)) {
      newPathValueMap[pathKey] = [newValuePair[0], newValuePair[1]];
      newPathStatusMap[pathKey] = [newStatusPair[0], newStatusPair[1]];
    }
  });

  const newViewNode = aggregateSameNamePair(newTargetTagNode, theOtherTag);
  const newRootNode = replaceTargetNode(rootNode, newViewNode);
  const newXmlData =
    xmlData.substring(0, oldStart) + value + xmlData.substring(oldEnd + 1);

  return {
    rootNode: newRootNode,
    pathStatusMap: newPathStatusMap,
    pathValueMap: newPathValueMap,
    xmlData: newXmlData,
  };
};
