import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import clsx from "clsx";
import React from "react";
import { useSelector } from "react-redux";
import { withSize } from "react-sizeme";
import { XmlTag } from "../../core/xmlParser";
import xmlProcessor, { XmlFile } from "../../core/xmlProcessor";
import { RootState } from "../../reducers";


const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      flex: 1,
      backgroundColor: theme.palette.background.paper,
      overflowY: "scroll",
      overflowX: "hidden",
      paddingBottom: 5,
      display: "flex",
      flexDirection: "column",
    },
    searchBar: {
      paddingLeft: 10,
      paddingRight: 10,
      marginTop: 10,
    },
    hide: {
      flex: 0,
      height: 0,
      width: 0,
      overflow: "hidden",
    },
    ellipsis: {
      textOverflow: "ellipsis",
      width: "100%",
      overflow: "hidden",
      whiteSpace: "nowrap",
    },
    iconContainer: {
      height: 15,
      width: 15,
      marginRight: 4,
    },
    closeIcon: {
      opacity: 0.3,
    },
    nodeContainer: {
      borderLeft: `1px dashed rgba(0, 0, 0, .87)`,
    },
  })
);

const SchemaTreeView = ({ className, size }: any): any => {
  const listRef = React.useRef(null);
  const [filterText, setFilterText] = React.useState("");
  const xmlList = useSelector((state: RootState) => state.schemaEditor.xmlList);
  const activeNodeId = useSelector(
    (state: RootState) => state.schemaEditor.activeNodeId
  );
  const pathOpenMap = useSelector(
    (state: RootState) => state.schemaEditor.pathOpenMap
  );

  const filteredXmlList: Array<XmlFile> = React.useMemo(() => {
    if (!filterText || filterText.length === 0) {
      return xmlList;
    }
    const searchResult = xmlProcessor.searchXmlTree(xmlList, filterText);
    return searchResult;
  }, [filterText, xmlList]);

  const treeWalker = React.useCallback(
    function* (refresh: boolean) {
      if (!filteredXmlList || filteredXmlList.length === 0) {
        return;
      }
      const stack = [];

      // Remember all the necessary data of the first node in the stack.

      stack.push({
        nestingLevel: 0,
        node: filteredXmlList.map((xmlFile: XmlFile) => xmlFile.rootNode),
      });

      // Walk through the tree until we have no nodes available.
      while (stack.length !== 0) {
        let {
          node,
          nestingLevel,
        }: { node: XmlTag | XmlTag[]; nestingLevel: number } = stack.pop();

        if (Array.isArray(node)) {
          for (let i: number = node.length - 1; i > 0; i--) {
            stack.push({ node: node[i], nestingLevel });
          }
          node = node[0];
        }

        if (!node) {
          continue;
        }

        const { id, children, defaultOpen, tagColor, tagName }: any = node;
        const attrName = node.attr.name;

        const isOpened = yield refresh
          ? {
              isLeaf: !children || children.length === 0,
              isOpenByDefault:
                filterText && defaultOpen ? true : pathOpenMap[id],
              tagName:
                tagName && (nestingLevel === 0 ? tagName : `<${tagName}>`),
              tagColor,
              nestingLevel,
              id,
              attrName,
            }
          : id;

        if (isOpened) {
          stack.push({ nestingLevel: nestingLevel + 1, node: children });
        }
      }
    },
    [filteredXmlList, filterText, pathOpenMap]
  );

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.recomputeTree({
        refreshNodes: true,
        useDefaultOpenness: true,
      });
    }
  }, [treeWalker]);

  const handleSearchTextChange = React.useCallback((e) => {
    setFilterText(e.target.value.toLowerCase());
  }, []);

  const itemData = React.useMemo(
    () => ({
      filterText,
      activeNodeId,
    }),
    [activeNodeId, filterText]
  );

  const classes = useStyles();
  return (
    <div className={clsx(classes.root, className)}>
      <TextField
        className={classes.searchBar}
        placeholder="Search..."
        margin="dense"
        size="small"
        id="filled-basic"
        variant="outlined"
        onChange={handleSearchTextChange}
      />
      {/* <FixedSizeTree
        ref={listRef}
        itemSize={24}
        treeWalker={treeWalker}
        height={size.height - 10 - 50}
        itemData={itemData}
      >
        {SchemaTreeViewNode}
      </FixedSizeTree> */}
    </div>
  );
};

export default React.memo(
  withSize({ monitorHeight: true, monitorWidth: true })(SchemaTreeView)
);
