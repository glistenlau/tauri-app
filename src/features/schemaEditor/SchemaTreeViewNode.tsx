import React from "react";
import SVGIcon from "../../components/SVGIcon";
import { makeStyles, createStyles } from "@material-ui/core/styles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../reducers";
import SchemaTreeViewNodeLabel from "./SchemaTreeViewNodeLabel";
import { toggleOpen, selectXmlNode } from "./schemaEditorSlice";
import { extractXmlFileIndex } from "../../core/xmlProcessor";

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

const SchemaTreeViewNode = React.memo(
  ({
    data: { isLeaf, attrName, tagName, id, nestingLevel, tagColor },
    treeData: { filterText, activeNodeId },
    isOpen,
    style,
    toggle,
  }: any) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const xmlList = useSelector(
      (state: RootState) => state.schemaEditor.xmlList
    );

    const rootIndex = React.useMemo(() => extractXmlFileIndex(id), [id]);

    const handleClickLabel = React.useCallback(
      () => dispatch(selectXmlNode(id)),
      [dispatch, id]
    );

    const handleToggle = React.useCallback(() => {
      if (isLeaf) {
        return;
      }
      toggle();
      if (!filterText) {
        dispatch(toggleOpen(id));
      }
    }, [isLeaf, filterText, dispatch, id, toggle]);

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
          highlight={activeNodeId === id}
          onClick={handleClickLabel}
          statusPair={
            !isNaN(rootIndex) &&
            rootIndex < xmlList.length &&
            xmlList[rootIndex].pathStatusMap[id]
          }
          tagName={tagName}
          attrName={attrName}
          filterText={filterText}
          tagColor={tagColor}
        />
      </div>
    );
  }
);

export default SchemaTreeViewNode;
