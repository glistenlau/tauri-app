import { createStyles, makeStyles } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import CodeIcon from "@material-ui/icons/Code";
import React from "react";
import ProcessIconButton from "../../components/ProgressIconButton";
import RunnerControlToolBar, {
  RunOptions,
} from "../runnerControl/RunnerControlToolBar";
import TransactionControlToolBar from "../transactionControl/TransactionControlToolBar";

interface DatabaseConsoleToolBarProps {
  onClickRun: (options: RunOptions) => void;
  onClickFormat: () => any;
}

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "row",
    },
    transactionContainer: {
      marginLeft: 10,
    },
  })
);

const DatabaseConsoleToolBar = React.memo(
  ({ onClickRun, onClickFormat }: DatabaseConsoleToolBarProps) => {
    const classes = useStyles();

    return (
      <div className={classes.container}>
        <RunnerControlToolBar onClickRun={onClickRun} />
        <Divider orientation="vertical" flexItem />
        <TransactionControlToolBar className={classes.transactionContainer} />
        <Divider orientation="vertical" flexItem />
        <ProcessIconButton title="Format statement" onClick={onClickFormat}>
          <CodeIcon color="primary" />
        </ProcessIconButton>
      </div>
    );
  }
);

export default DatabaseConsoleToolBar;
