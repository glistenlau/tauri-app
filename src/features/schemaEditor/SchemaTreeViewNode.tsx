import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { useCallback, useContext, useMemo } from "react";
import { useDispatch } from "react-redux";
import SVGIcon from "../../components/SVGIcon";
import { extractXmlFileIndex } from "../../core/xmlProcessor";
import { getHashColor } from "../../util";
import { toggleOpen } from "./schemaEditorSlice";
import { SchemaEditorContext } from "./SchemaEditorView";
import { NodeData } from "./SchemaTreeView";
import SchemaTreeViewNodeLabel from "./SchemaTreeViewNodeLabel";

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

interface SchemaTreeViewNodeProps {
  data: NodeData;
  isOpen: boolean;
  style: any;
  setOpen: (open: boolean) => {};
  treeData?: any;
}

const SchemaTreeViewNode = React.memo(
  ({
    data: { isLeaf, nameAttr, tagName, id, nestingLevel, dbFamily },
    treeData: { filterText, selectedNodeId, toggleOpen },
    isOpen,
    setOpen,
    style,
  }: SchemaTreeViewNodeProps) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const { onSelectNode } = useContext(SchemaEditorContext);

    const rootIndex = React.useMemo(() => extractXmlFileIndex(id), [id]);

    const tagColor = useMemo(() => getHashColor(tagName)[800], [tagName]);

    const onClickLabel = useCallback(
      () => onSelectNode(id),
      [id, onSelectNode]
    );

    const handleToggle = React.useCallback(() => {
      if (isLeaf) {
        return;
      }
      setOpen(!isOpen);
      if (!filterText) {
        toggleOpen(id);
      }
    }, [isLeaf, setOpen, isOpen, filterText, toggleOpen, id]);

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
        <SchemaTreeViewNodeLabel
          highlight={selectedNodeId === id}
          onClick={onClickLabel}
          tagName={tagName}
          attrName={nameAttr}
          filterText={filterText}
          tagColor={tagColor}
          dbFamily={dbFamily}
        />
      </div>
    );
  }
);

export default SchemaTreeViewNode;
