import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import clsx from "clsx";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { withSize } from "react-sizeme";
import { TreeWalker } from "react-vtree";
import { FixedSizeTree } from "react-vtree/dist/es/FixedSizeTree";
import { DbSchemaSearchFlatQuery, FlatNode } from "../../generated/graphql";
import { RootState } from "../../reducers";
import SchemaTreeViewNode from "./SchemaTreeViewNode";

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

interface SchemaTreeViewProps {
  treeData: DbSchemaSearchFlatQuery;
  size?: any;
  className?: String;
}

export interface NodeData {
  readonly id: string;
  readonly isOpenByDefault: boolean;
  isLeaf: boolean;
  tagName: string;
  nameAttr: Maybe<string>;
  nestingLevel: number;
}

interface Node {
  data: NodeData;
  node: FlatNode;
}

const getNodeData = (node: FlatNode, index: number): Node => ({
  data: {
    id: `file${node.fileIndex}-${index}`,
    isLeaf: node.childIndexes == null || node.childIndexes.length === 0,
    isOpenByDefault: true,
    tagName: node.tagName,
    nameAttr: node.nameAttr,
    nestingLevel: node.nestingLevel,
  },
  node,
});

const SchemaTreeView = ({
  className,
  size,
  treeData,
}: SchemaTreeViewProps): any => {
  const listRef = React.useRef(null);
  const [filterText, setFilterText] = React.useState("");
  const activeNodeId = useSelector(
    (state: RootState) => state.schemaEditor.activeNodeId
  );
  const pathOpenMap = useSelector(
    (state: RootState) => state.schemaEditor.pathOpenMap
  );

  const filterIds = useMemo(() => {
    if (!filterText || filterText.length === 0) {
      return null;
    }

    return treeData.dbSchemasFlat.map((fileRes) => {
      const filter = new Set();
      fileRes.nodes.forEach(node => {
        if (node.tagName.includes(filterText) || (node.nameAttr || "").includes(filterText)) {
          node
        }
      })
    });

  }, []);


  const treeWalker: TreeWalker<NodeData, Node> = useCallback(
    function* (): Generator<Node | undefined, any, Node> {
      if (!treeData || treeData.dbSchemasFlat.length === 0) {
        return;
      }

      for (let i = 0; i < treeData.dbSchemasFlat.length; i++) {
        yield getNodeData(treeData.dbSchemasFlat[i].nodes[0], 0);
      }

      while (true) {
        const parent = yield;
        if (!parent) {
          continue;
        }

        if (!parent.node.childIndexes) {
          continue;
        }

        for (let childIndex of parent.node.childIndexes) {
          yield getNodeData(
            treeData.dbSchemasFlat[parent.node.fileIndex].nodes[childIndex],
            childIndex
          );
        }
      }
    },
    [treeData]
  );

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
      <FixedSizeTree
        ref={listRef}
        itemSize={24}
        treeWalker={treeWalker}
        height={size.height - 10 - 50}
        itemData={itemData}
      >
        {SchemaTreeViewNode}
      </FixedSizeTree>
    </div>
  );
};

export default React.memo(
  withSize({ monitorHeight: true, monitorWidth: true })(SchemaTreeView)
);
