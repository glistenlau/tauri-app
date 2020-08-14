import React from "react";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import { makeStyles, createStyles } from "@material-ui/core/styles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../reducers";
import {
  toggleDiffMode,
  toggleActiveEditor,
  selectXmlNode,
} from "./schemaEditorSlice";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Button from "@material-ui/core/Button";
import PathBreadcrumbs from "../../components/PathBreadcrumbs";
import SVGIcon from "../../components/SVGIcon";
import Tooltip from "../../components/Tooltip";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      width: "100%",
      alignItems: "center",
      height: 52,
    },
    path: {
      flex: 1,
      overflow: "hidden",
      marginLeft: 10,
    },
    activeButtons: {
      marginLeft: 10,
      marginRight: 10,
    },
    diff: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      flexDirection: "row",
    },
  })
);

const SchemaTreeViewToolBar = React.memo(() => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const diffMode = useSelector(
    (state: RootState) => state.schemaEditor.diffMode
  );
  const activePair = useSelector(
    (state: RootState) => state.schemaEditor.activePair
  );
  const activeNodePaths = useSelector(
    (state: RootState) => state.schemaEditor.activeNodePaths
  );

  const handleToogleDiff = React.useCallback(() => {
    dispatch(toggleDiffMode());
  }, [dispatch]);

  const controlRenderer = React.useMemo(
    () => (
      <Switch checked={diffMode} value="diffCode" onChange={handleToogleDiff} />
    ),
    [diffMode, handleToogleDiff]
  );

  const handleClickPath = React.useCallback(
    (id) => dispatch(selectXmlNode(id)),
    [dispatch]
  );

  const pathBreadcrumbs = React.useMemo(
    () =>
      activeNodePaths.map((valuePair, index) => {
        if (!valuePair || !Array.isArray(valuePair)) {
          return null;
        }
        const tag = valuePair.find((value) => value !== null);
        if (tag === undefined) {
          return null;
        }
        const result: any = { id: tag.id };
        let tagName = tag.tagName;
        if (index > 0 || tagName.indexOf(".") === -1) {
          tagName = `<${tagName}>`;
        }
        const attrName = tag.attr.name;
        result.value = (active?: boolean) => (
          <span
            key={tag.id}
            style={{
              flex: 1,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {tagName && (
              <Typography
                component="span"
                color="textPrimary"
                style={{
                  color: active ? "#6200EE" : tag.tagColor,
                }}
              >
                {tagName}
              </Typography>
            )}
            {tagName && attrName && <Typography component="span"> </Typography>}
            {attrName && (
              <Typography
                component="span"
                color="textPrimary"
                style={{ color: active ? "#6200EE" : undefined }}
              >
                {attrName}
              </Typography>
            )}
          </span>
        );

        return result;
      }),
    [activeNodePaths]
  );

  const handleClickLeft = React.useCallback(() => {
    dispatch(toggleActiveEditor(0));
  }, [dispatch]);
  const handleClickRight = React.useCallback(() => {
    dispatch(toggleActiveEditor(1));
  }, [dispatch]);

  return (
    <div className={classes.container}>
      <PathBreadcrumbs
        className={classes.path}
        onClick={handleClickPath}
        paths={pathBreadcrumbs}
      />
      <div className={classes.diff}>
        {!diffMode && (
          <ButtonGroup className={classes.activeButtons} size="small">
            <Tooltip
              title={activePair[0] ? "Hide left editor" : "Show left editor"}
            >
              <Button
                variant={activePair[0] ? "contained" : "outlined"}
                onClick={handleClickLeft}
                style={{
                  backgroundColor: activePair[0] ? "#d12e26" : undefined,
                }}
              >
                <SVGIcon
                  name="database"
                  fill={activePair[0] ? "white" : "#d12e26"}
                  width={20}
                  height={20}
                />
              </Button>
            </Tooltip>
            <Tooltip
              title={activePair[1] ? "Hide right editor" : "Show right editor"}
            >
              <Button
                variant={activePair[1] ? "contained" : "outlined"}
                onClick={handleClickRight}
                style={{
                  backgroundColor: activePair[1] ? "#81c784" : undefined,
                }}
              >
                <SVGIcon name="postgres" width={20} height={20} />
              </Button>
            </Tooltip>
          </ButtonGroup>
        )}
        <FormControlLabel control={controlRenderer} label="Diff" />
      </div>
    </div>
  );
});

export default SchemaTreeViewToolBar;
