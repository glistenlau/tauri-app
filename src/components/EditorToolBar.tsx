import { green, orange, purple } from "@material-ui/core/colors";
import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";
import {
  createStyles,
  makeStyles,
  Theme,
  withStyles
} from "@material-ui/core/styles";
import MTooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import CodeIcon from "@material-ui/icons/Code";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import SaveIcon from "@material-ui/icons/Save";
import React, { useMemo } from "react";
import { ValidateResult } from "../apis/javaProps";
import RunnerControlToolBar from "../features/runnerControl/RunnerControlToolBar";
import TransactionControlToolBar from "../features/transactionControl/TransactionControlToolBar";
import { stringifySqlError } from "../util";
import DiffToolBar from "./DiffToolbar";
import ProcessIconButton from "./ProgressIconButton";

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
  activePair: [boolean, boolean];
  diff: boolean;
  onActivePairChange: (activePair: [boolean, boolean]) => any;
  onClickCopy: any;
  onClickDiff: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  onClickFormat: any;
  onClickRun: any;
  onClickSave: any;
  validateResult?: ValidateResult;
}

const EditorToolBar: React.FC<EditorToolBarPropsType> = ({
  activePair,
  diff,
  onClickCopy,
  onActivePairChange,
  onClickDiff,
  onClickFormat,
  onClickRun,
  onClickSave,
  validateResult,
}) => {

  const classes = useStyles();
  const validateMessage = useMemo(() => {
    if (
      !validateResult ||
      validateResult.status === "pass" ||
      !validateResult.error
    ) {
      return null;
    }

    return stringifySqlError(validateResult.error);
  }, [validateResult]);

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

      <DiffToolBar
        activePair={activePair}
        diffMode={diff}
        onActivePairChange={onActivePairChange}
        onToogleDiff={onClickDiff}
      />
    </div>
  );
}

export default React.memo(EditorToolBar);
