import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import clsx from "clsx";
import { Maybe } from "graphql/jsutils/Maybe";
import React, { useCallback, useMemo } from "react";
import { withSize } from "react-sizeme";
import { TreeWalker } from "react-vtree";
import { FixedSizeTree } from "react-vtree/dist/es/FixedSizeTree";
import {
  AppStateKey,
  DbFamily,
  FlatNode,
  FlatSchemaFile,
} from "../../generated/graphql";
import { useAppState } from "../../hooks/useAppState";
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
  treeData: Array<FlatSchemaFile>;
  selectedNodeId?: string;
  size?: any;
  className?: string;
}

export interface NodeData {
  readonly id: string;
  readonly isOpenByDefault: boolean;
  dbFamily?: DbFamily;
  isLeaf: boolean;
  tagName: string;
  nameAttr: Maybe<string>;
  nestingLevel: number;
}

interface Node {
  data: NodeData;
  node: FlatNode;
}

const shouldNodeDisplayed = (
  nodes: Array<FlatNode>,
  nodeIndex: number,
  filterIds: [Set<number>, Set<number>]
): boolean => {
  let index = nodeIndex;
  const [displaySet, matchSet] = filterIds;
  if (displaySet.has(index)) {
    return true;
  }

  while (true) {
    const node = nodes[index];
    if (matchSet.has(index)) {
      return true;
    }
    if (node == null || node.parentIndex == null) {
      break;
    }

    index = node.parentIndex;
  }

  return false;
};

const getNodeData = (
  node: FlatNode,
  index: number,
  isOpenByDefault: boolean
): Node => ({
  data: {
    id: node.id,
    isLeaf: node.childIndexes == null || node.childIndexes.length === 0,
    isOpenByDefault: isOpenByDefault,
    tagName: node.tagName,
    nameAttr: node.nameAttr,
    nestingLevel: node.nestingLevel,
    dbFamily: node.dbFamily || undefined,
  },
  node,
});

const SchemaTreeView = ({
  className,
  selectedNodeId,
  size,
  treeData,
}: SchemaTreeViewProps): any => {
  const listRef = React.useRef(null);
  const [filterText, setFilterText] = useAppState<string>(
    AppStateKey.SchemaEditorSearchTerm,
    ""
  );
  const [openNodeIds, setOpenNodeIds] = useAppState<{ [key: string]: boolean }>(
    AppStateKey.SchemaEditorOpenNodeIds,
    {} as { [key: string]: boolean }
  );

  const [filterIds, surviveNodeCount] = useMemo(() => {
    if (!filterText || filterText.length === 0) {
      return [null, Number.MAX_SAFE_INTEGER];
    }

    let count = 0;
    const filterIds = treeData.map((fileRes) => {
      const displaySet = new Set<number>();
      const matchSet = new Set<number>();
      fileRes.nodes.forEach((node) => {
        if (
          node.tagName.toLowerCase().includes(filterText) ||
          (node.nameAttr || "").toLowerCase().includes(filterText)
        ) {
          const ancestorIds = node.id.split("-").slice(1);

          ancestorIds.forEach((is, index) => {
            const numberId = parseInt(is);
            if (index === ancestorIds.length - 1) {
              matchSet.add(numberId);
            } else {
              displaySet.add(numberId);
            }
            count += 1;
          });
        }
      });
      return [displaySet, matchSet] as [Set<number>, Set<number>];
    });

    return [filterIds, count];
  }, [filterText, treeData]);

  const treeWalker: TreeWalker<NodeData, Node> = useCallback(
    function* (): Generator<Node | undefined, any, Node> {
      for (let i = 0; i < treeData.length; i++) {
        if (filterIds != null && !filterIds[i][0].has(0)) {
          continue;
        }
        const node = treeData[i].nodes[0];
        yield getNodeData(
          node,
          0,
          (filterText?.length ?? 0) > 0 || (openNodeIds ?? {})[node.id] === true
        );
      }

      while (true) {
        const parent = yield;
        if (!parent) {
          continue;
        }

        if (!parent.node.childIndexes) {
          continue;
        }

        const nodes = treeData[parent.node.fileIndex].nodes;
        const [displaySet, matchSet] =
          filterIds == null ? [null, null] : filterIds[parent.node.fileIndex];

        for (let childIndex of parent.node.childIndexes) {
          const node = nodes[childIndex];
          if (
            filterIds != null &&
            !shouldNodeDisplayed(
              nodes,
              childIndex,
              filterIds[parent.node.fileIndex]
            )
          ) {
            continue;
          }

          yield getNodeData(
            node,
            childIndex,
            (displaySet != null && displaySet.has(childIndex)) ||
              (openNodeIds ?? {})[node.id] === true
          );
        }
      }
    },
    [filterIds, filterText?.length, openNodeIds, treeData]
  );

  const handleSearchTextChange = React.useCallback(
    (e) => {
      setFilterText(e.target.value.trim().toLowerCase());
    },
    [setFilterText]
  );

  const handleOpenToggle = useCallback(
    (id: string) => {
      if (!openNodeIds) {
        return;
      }
      if (openNodeIds[id]) {
        const { [id]: removeId, ...others } = openNodeIds;
        setOpenNodeIds(others);
      } else {
        const newOpenNodeIds = Object.assign({}, openNodeIds, { [id]: true });
        setOpenNodeIds(newOpenNodeIds);
      }
    },
    [openNodeIds, setOpenNodeIds]
  );

  const itemData = React.useMemo(
    () => ({
      filterText,
      selectedNodeId,
      toggleOpen: handleOpenToggle,
    }),
    [filterText, selectedNodeId, handleOpenToggle]
  );

  const classes = useStyles();
  return (
    <div className={clsx(classes.root, className)}>
      <TextField
        autoComplete="off"
        className={classes.searchBar}
        placeholder="Search..."
        margin="dense"
        size="small"
        id="filled-basic"
        variant="outlined"
        value={filterText}
        onChange={handleSearchTextChange}
      />
      {surviveNodeCount > 0 && treeData != null && (
        <FixedSizeTree
          ref={listRef}
          itemSize={24}
          treeWalker={treeWalker}
          height={size.height - 10 - 50}
          itemData={itemData}
        >
          {SchemaTreeViewNode}
        </FixedSizeTree>
      )}
    </div>
  );
};

export default React.memo(
  withSize({ monitorHeight: true, monitorWidth: true })(SchemaTreeView)
);
