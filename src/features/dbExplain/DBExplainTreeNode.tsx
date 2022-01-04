import React, { useCallback, useEffect, useMemo, useState } from "react";
import TreeNode, { TreeNodeProps } from "../../components/TreeNode";
import { useDbExplainQueryLazyQuery } from "../../generated/graphql";
import {
  DBExplainTreeItemData,
  DBExplainTreeNodeData,
} from "./DBExplainTreeView";

export const DBExplainTreeNode: React.FC<
  TreeNodeProps<DBExplainTreeNodeData, DBExplainTreeItemData>
> = (props) => {
  const {
    data: { id, name, operation, aTime },
    treeData: { explainText, onLoadNode, onToggle },
  } = props;
  const [canLoad, setCanLoad] = useState(false);
  const [loadNode, { called, loading, data }] = useDbExplainQueryLazyQuery({
    variables: {
      explainText: explainText,
      targetId: parseInt(id),
    },
  });

  const displayValue = useMemo(() => {
    const values = [id, operation];
    if (name) {
      values.push(name);
    }
    if (aTime) {
      values.push(aTime);
    }
    return values.join(" - ");
  }, [aTime, id, name, operation]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if (!data.dbExplain) {
      return;
    }
    if (!canLoad) {
      return;
    }
    setCanLoad(false);
    // onLoadNode(parseInt(id), data.dbExplain);
  }, [canLoad, data, id, onLoadNode]);

  const handleToggle = useCallback(
    (state: boolean) => {
      onToggle(parseInt(id), state);
      if (called) {
        return;
      }
      if (!state) {
        return;
      }
      loadNode();
      setCanLoad(true);
    },
    [called, id, loadNode, onToggle]
  );

  return (
    <TreeNode onToggle={handleToggle} {...props}>
      {displayValue}
    </TreeNode>
  );
};
