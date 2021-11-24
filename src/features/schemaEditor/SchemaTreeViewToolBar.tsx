import { createStyles, makeStyles } from "@material-ui/core/styles";
import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import DiffToolBar from "../../components/DiffToolbar";
import { RootState } from "../../reducers";
import { setActivePair, toggleDiffMode } from "./schemaEditorSlice";

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

  const handleToogleDiff = React.useCallback(() => {
    dispatch(toggleDiffMode());
  }, [dispatch]);

  const handleClickPath = React.useCallback((id) => { }, [dispatch]);

  // const pathBreadcrumbs = React.useMemo(
  //   () =>
  //     activeNodePaths.map((valuePair, index) => {
  //       if (!valuePair || !Array.isArray(valuePair)) {
  //         return null;
  //       }
  //       const tag = valuePair.find((value) => value !== null);
  //       if (tag === undefined) {
  //         return null;
  //       }
  //       const result: any = { id: tag.id };
  //       let tagName = tag.tagName;
  //       if (index > 0 || tagName.indexOf(".") === -1) {
  //         tagName = `<${tagName}>`;
  //       }
  //       const attrName = tag.attr.name;
  //       result.value = (active?: boolean) => (
  //         <span
  //           key={tag.id}
  //           style={{
  //             flex: 1,
  //             textOverflow: "ellipsis",
  //             overflow: "hidden",
  //             whiteSpace: "nowrap",
  //           }}
  //         >
  //           {tagName && (
  //             <Typography
  //               component="span"
  //               color="textPrimary"
  //               style={{
  //                 color: active ? "#6200EE" : tag.tagColor,
  //               }}
  //             >
  //               {tagName}
  //             </Typography>
  //           )}
  //           {tagName && attrName && <Typography component="span"> </Typography>}
  //           {attrName && (
  //             <Typography
  //               component="span"
  //               color="textPrimary"
  //               style={{ color: active ? "#6200EE" : undefined }}
  //             >
  //               {attrName}
  //             </Typography>
  //           )}
  //         </span>
  //       );

  //       return result;
  //     }),
  //   [activeNodePaths]
  // );

  const handleActivePairChange = useCallback(
    (activePair: [boolean, boolean]) => {
      dispatch(setActivePair(activePair));
    },
    [dispatch]
  );

  return (
    <div className={classes.container}>
      {/* <PathBreadcrumbs
        className={classes.path}
        onClick={handleClickPath}
        paths={pathBreadcrumbs}
      /> */}
      <DiffToolBar
        activePair={activePair}
        diffMode={diffMode}
        onActivePairChange={handleActivePairChange}
        onToogleDiff={handleToogleDiff}
      />
    </div>
  );
});

export default SchemaTreeViewToolBar;
