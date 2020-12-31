import { ListSubheader, MenuItem } from "@material-ui/core";
import { cyan, pink, purple } from "@material-ui/core/colors";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import SettingsBackupRestoreIcon from "@material-ui/icons/SettingsBackupRestore";
import clsx from "clsx";
import React, { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { GlobalContext } from "../../App";
import ProcessIconButton from "../../components/ProgressIconButton";
import SVGIcon from "../../components/SVGIcon";
import databaseConsole from "../../core/databaseConsole";
import { RootState } from "../../reducers";
import {
  changeTransactionMode,
  changeUncommitCount,
  TransactionMode
} from "./transactionControlSlice";

const useStyles = makeStyles((theme) =>
  createStyles({
    buttonContainer: {
      display: "flex",
      backgroundColor: theme.palette.background.default,
      flexDirection: "row",
      alignItems: "center"
    },
    select: {
      backgroundColor: theme.palette.background.paper,
      width: 150
    },
    commit: {
      color: purple[500]
    },
    rollback: {
      color: cyan[500]
    }
  })
);

export interface TransactionControlToolBarProps {
  className?: any;
}

const TransactionControlToolBar = React.memo(
  (props: TransactionControlToolBarProps) => {
    const { className, ...others } = props;

    const transactionMode = useSelector(
      (rootState: RootState) => rootState.transactionControl.transactionMode
    );
    const uncommitCount = useSelector(
      (rootState: RootState) => rootState.transactionControl.uncommitCount
    );

    const { isRunning } = useContext(GlobalContext);

    const classes = useStyles();
    const dispatch = useDispatch();

    const handleTransactionModeChange = React.useCallback(
      async (e) => {
        const transactionValue = e.target.value;
        if (transactionValue !== "Auto" && transactionValue !== "Manual") {
          return;
        }

        dispatch(changeTransactionMode(transactionValue));

        try {
          await databaseConsole.setTransactionMode(transactionValue);
        } catch (e) {
        } finally {
          dispatch(changeUncommitCount(0));
        }
      },
      [dispatch]
    );

    const handleClickCommit = React.useCallback(async () => {
      try {
        await databaseConsole.commit();
      } catch (e) {
      } finally {
        dispatch(changeUncommitCount(0));
      }
    }, [dispatch]);

    const handleClickRollback = React.useCallback(async () => {
      try {
        await databaseConsole.rollback();
      } catch (e) {
      } finally {
        dispatch(changeUncommitCount(0));
      }
    }, [dispatch]);

    const buttonsDisabled = React.useMemo(
      () =>
        isRunning ||
        uncommitCount === 0 ||
        transactionMode === TransactionMode.Auto,
      [isRunning, transactionMode, uncommitCount]
    );

    return (
      <div className={clsx(classes.buttonContainer, className)} {...others}>
        <TextField
          className={classes.select}
          select
          disabled={isRunning}
          color='primary'
          id='schema'
          label='Tx'
          size='small'
          variant='outlined'
          margin='dense'
          onChange={handleTransactionModeChange}
          value={transactionMode}
        >
          <ListSubheader>Transaction Mode</ListSubheader>
          <MenuItem value={"Auto"}>Auto</MenuItem>
          <MenuItem value={"Manual"}>Manual</MenuItem>
        </TextField>

        <ProcessIconButton
          title='Commit'
          onClick={handleClickCommit}
          disabled={buttonsDisabled}
        >
          <SVGIcon
            name='plane'
            color={buttonsDisabled ? "disabled" : undefined}
            fill={pink[500]}
          />
        </ProcessIconButton>

        <ProcessIconButton
          title='Rollback'
          onClick={handleClickRollback}
          disabled={buttonsDisabled}
        >
          <SettingsBackupRestoreIcon
            className={buttonsDisabled ? undefined : classes.rollback}
            color={buttonsDisabled ? "disabled" : undefined}
          />
        </ProcessIconButton>
      </div>
    );
  }
);

export default TransactionControlToolBar;
