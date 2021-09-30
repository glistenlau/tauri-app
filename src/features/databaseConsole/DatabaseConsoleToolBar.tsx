import { createStyles, makeStyles } from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import React from "react";
import RunnerControlToolBar, {
  RunOptions,
} from "../runnerControl/RunnerControlToolBar";
import TransactionControlToolBar from "../transactionControl/TransactionControlToolBar";

interface DatabaseConsoleToolBarProps {
  onClickRun: (options: RunOptions) => void;
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
  ({ onClickRun }: DatabaseConsoleToolBarProps) => {
    const classes = useStyles();

    return (
      <div className={classes.container}>
        <RunnerControlToolBar onClickRun={onClickRun} />
        <Divider orientation="vertical" flexItem />
        <TransactionControlToolBar className={classes.transactionContainer} />
      </div>
    );
  }
);

export default DatabaseConsoleToolBar;
