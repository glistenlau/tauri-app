import React from "react";
import CodeIcon from "@material-ui/icons/Code";
import SaveIcon from "@material-ui/icons/Save";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import MTooltip from "@material-ui/core/Tooltip";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Divider from "@material-ui/core/Divider";
import { green, purple, orange } from "@material-ui/core/colors";
import {
  createStyles,
  makeStyles,
  withStyles,
  Theme,
} from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

import ProcessIconButton from "./ProgressIconButton";
import RunnerControlToolBar from "../features/runnerControl/RunnerControlToolBar";
import TransactionControlToolBar from "../features/transactionControl/TransactionControlToolBar";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "row",
      padding: 10,
      marginBottom: 10,
    },
    transactionControl: {
      marginLeft: 10,
    },
    buttonContainer: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      width: "100%",
      alignItems: "center",
    },
    runnerContainer: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      alignItems: "center",
    },
    inputSchema: {
      backgroundColor: theme.palette.background.paper,
      marginLeft: 10,
      width: 150,
    },
    button: {
      height: 45,
      width: 45,
    },
    select: {
      flex: 1,
      width: 200,
    },
    play: {
      color: green[500],
    },
    copyIcon: {
      color: orange[500],
    },
    saveIcon: {
      color: purple[500],
    },
    diff: {
      marginLeft: "auto",
    },
    process: {
      width: 44,
      height: 44,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  })
);

const HtmlTooltip = withStyles((theme: Theme) => ({
  tooltip: {
    backgroundColor: "rgb(255, 164, 162)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: "30vw",
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}))(MTooltip);

export interface EditorToolBarPropsType {
  diff: boolean;
  onClickCopy: any;
  onClickDiff: any;
  onClickFormat: any;
  onClickRun: any;
  onClickSave: any;
  validateResult: any;
}

function EditorToolBar(props: EditorToolBarPropsType) {
  const {
    diff,
    onClickCopy,
    onClickDiff,
    onClickFormat,
    onClickRun,
    onClickSave,
    validateResult,
  } = props;

  const classes = useStyles();
  const validateMessage =
    validateResult && validateResult.error && validateResult.error.message;

  return (
    <div className={classes.buttonContainer}>
      <RunnerControlToolBar onClickRun={onClickRun} />
      <Divider orientation="vertical" flexItem />
      <TransactionControlToolBar className={classes.transactionControl} />
      <Divider orientation="vertical" flexItem />
      <ProcessIconButton title="Format statement" onClick={onClickFormat}>
        <CodeIcon color="primary" />
      </ProcessIconButton>
      <ProcessIconButton title="Save property" onClick={onClickSave}>
        <SaveIcon className={classes.saveIcon} />
      </ProcessIconButton>

      <ProcessIconButton
        title="Copy statement to clipboard"
        onClick={onClickCopy}
      >
        <FileCopyIcon className={classes.copyIcon} />
      </ProcessIconButton>
      {validateMessage && (
        <HtmlTooltip
          interactive
          leaveDelay={1000}
          title={
            <React.Fragment>
              <Typography style={{ whiteSpace: "pre-line" }}>
                {validateMessage}
              </Typography>
            </React.Fragment>
          }
        >
          <IconButton className={classes.button}>
            <ErrorOutlineIcon color="error" />
          </IconButton>
        </HtmlTooltip>
      )}

      <FormControlLabel
        className={classes.diff}
        control={
          <Switch checked={diff} value="diffCode" onChange={onClickDiff} />
        }
        label="Diff"
      />
    </div>
  );
}

export default React.memo(EditorToolBar);
