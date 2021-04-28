import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { ReactNode } from "react";
import SVGIcon from "./SVGIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    closeIcon: {
      opacity: 0.3,
    },
    icon: {
      opacity: 0.87,
    },
    nodeContainer: {
      borderLeft: `1px dashed rgba(0, 0, 0, .87)`,
    },
    iconContainer: {
      height: 15,
      width: 15,
      marginRight: 4,
    },
  })
);

export interface TreeNodeData {
  id: string;
  isLeaf: boolean;
  isOpenByDefault: boolean;
  nestingLevel: number;
}

export interface TreeNodeProps<D extends TreeNodeData, T> {
  data: D;
  isOpen: boolean;
  style: any;
  setOpen: (state: boolean) => Promise<void>;
  onToggle?: (state: boolean) => void;
  children?: ReactNode;
  treeData: T;
}

function TreeNode<D extends TreeNodeData, T>({
  data: { isLeaf, id, nestingLevel },
  onToggle,
  isOpen,
  style,
  setOpen,
  children,
  treeData,
}: TreeNodeProps<D, T>) {
  const classes = useStyles();
  const handleToggle = React.useCallback(() => {
    if (isLeaf) {
      return;
    }
    setOpen(!isOpen);
    if (onToggle) {
        onToggle(!isOpen);
    }
  }, [isLeaf, setOpen, isOpen, onToggle]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft:
          nestingLevel === 0
            ? 10
            : 7 * nestingLevel + 18 * (nestingLevel - 1) + 28,
        paddingRight: 10,
        ...style,
      }}
      onDoubleClick={handleToggle}
    >
      {Array.from(Array(nestingLevel).keys()).map((v) => (
        <div
          key={`line-${v}`}
          className={classes.nodeContainer}
          style={{
            width: 0,
            height: 24,
            position: "absolute",
            left: 7 * (v + 1) + 18 * v + 10,
          }}
        />
      ))}
      <div
        className={classes.iconContainer}
        onClick={isLeaf ? undefined : handleToggle}
      >
        {isLeaf ? (
          <SVGIcon
            className={classes.closeIcon}
            name="closeSquare"
            height={15}
            width={15}
          />
        ) : isOpen ? (
          <SVGIcon name="minusSquare" height={15} width={15} />
        ) : (
          <SVGIcon name="plusSquare" height={15} width={15} />
        )}
      </div>
      {children}
    </div>
  );
}

export default TreeNode;
