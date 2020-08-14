import React from "react";
import Divider from "@material-ui/core/Divider";

import RunnerControlToolBar from "../runnerControl/RunnerControlToolBar";
import TransactionControlToolBar from "../transactionControl/TransactionControlToolBar";
import { makeStyles, createStyles } from "@material-ui/core";

interface DatabaseConsoleToolBarProps {
  onClickRun: Function;
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
