import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SizeMeProps, withSize } from "react-sizeme";
import styled from "styled-components";
import { TreeNodeData } from "../../components/TreeNode";
import { ExplainRow, useDbExplainQueryQuery } from "../../generated/graphql";

interface DBExplainTreeViewProps {
  explainText: string;
}

export type DBExplainTreeNodeData = TreeNodeData &
  Omit<ExplainRow, "id" | "hasChildren">;

export interface DBExplainTreeData {
  data: DBExplainTreeNodeData;
  nestingLevel: number;
  node: ExplainRow;
}

export interface DBExplainTreeItemData {
  onLoadNode: (id: number, node: ExplainRow) => void;
  onToggle: (id: number, state: boolean) => void;
  explainText: string;
}

const getNodeData = (
  node: ExplainRow,
  nestingLevel: number,
  isOpenByDefault: boolean
): DBExplainTreeData => {
  const { id, hasChildren, ...other } = node;
  return {
    data: {
      id: node.id.toString(),
      isLeaf: !node.hasChildren,
      isOpenByDefault,
      nestingLevel,
      ...other,
    },
    nestingLevel,
    node,
  };
};

const Container = styled.div`
  width: 50%;
  height: 100%;
`;

const updateNodeTree = (curNode: ExplainRow, node: ExplainRow): ExplainRow => {
  if (curNode.id === node.id) {
    return node;
  }
  if (!curNode.children || curNode.children.length === 0) {
    return curNode;
  }

  const newChildren = curNode.children.map((child) =>
    updateNodeTree(child, node)
  );

  return Object.assign({}, curNode, { children: newChildren });
};

const DBExplainTreeView: React.FC<DBExplainTreeViewProps & SizeMeProps> = ({
  size,
  explainText,
}) => {
  const openSet = useRef(new Set());
  const [root, setRoot] = useState<ExplainRow>();
  const { data, refetch } = useDbExplainQueryQuery({
    variables: { explainText },
  });

  useEffect(() => {
    if (!data) {
      return;
    }
    // setRoot(data.dbExplain);
  }, [data]);

  const loadNode = useCallback(
    (id: number, node: ExplainRow) => {
      if (root == null) {
        return;
      }

      const newRoot = updateNodeTree(root, node);

      setRoot(newRoot);
    },
    [root]
  );

  const onToggle = useCallback((id: number, state: boolean) => {
    if (!state) {
      openSet.current.delete(id);
    } else {
      openSet.current.add(id);
    }
  }, []);

  const treeWalker = useCallback(
    function* () {
      if (!root) {
        return undefined;
      }
      yield getNodeData(root, 0, openSet.current.has(root.id));

      while (true) {
        const parent: DBExplainTreeData = yield;

        if (parent.node.children) {
          for (const child of parent.node.children) {
            yield getNodeData(
              child,
              parent.nestingLevel + 1,
              openSet.current.has(child.id)
            );
          }
        }
      }
    },
    [root]
  );

  const content = useMemo(() => {
    if (root == null) {
      return <></>;
    }

    const height = size.height || 100;

    return null;
    // return (
    //   <Tree
    //     treeWalker={treeWalker}
    //     itemSize={24}
    //     height={height}
    //     itemData={{ onLoadNode: loadNode, explainText, onToggle }}
    //   >
    //     {DBExplainTreeNode}
    //   </Tree>
    // );
  }, [root, size.height]);

  return <Container>{content}</Container>;
};

export default withSize({ monitorHeight: true })(DBExplainTreeView);
