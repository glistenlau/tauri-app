/* eslint-disable import/no-webpack-loader-syntax */
import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import { createStyles, withStyles } from "@material-ui/styles";
import { connect } from "react-redux";

import DiffEditor from "./DiffEditor";
import QueryRunner from "./QueryRunner";
import Navigator from "./Navigator";
import Notification from "./Notification";
import SettingsContainer from "./SettingsContainer";
import {
  initialState,
  connectToOracle,
  connectToPostgres,
  showNotification,
  initApp,
} from "../actions";
import DatabaseConsole, { EVENTS } from "../core/databaseConsole";
import ExitDialog from "../components/ExitDialog";
import DatabaseConsolePage from "../features/databaseConsole/DatabaseConsoleView";
import RunnerResultPanel from "../features/runnerResult/RunnerResultPanel";
import SchemaEditorView from "../features/schemaEditor/SchemaEditorView";
import { changeIsRunning } from "../features/runnerControl/runnerControlSlice";
import { persistor } from "../index";
import Divider from "@material-ui/core/Divider";
import oracleClient from "../core/oracle";
import postgresClient from "../core/postgres";
import { RootState } from "../reducers";

const styles: any = (theme: any) =>
  createStyles({
    rootContainer: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "row",
    },
    rightContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "80%",
      flex: 1,
    },
  });

class Root extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      showClosingDialog: false,
    };
  }

  render() {
    const { classes, activeView } = this.props;
    const { showClosingDialog } = this.state;

    return (
      <div className={classes.rootContainer}>
        <CssBaseline />
        <Navigator />
        <Divider />
        <div className={classes.rightContainer}>
          <DiffEditor active={activeView === 0} />
          <DatabaseConsolePage active={activeView === 1} />
          <RunnerResultPanel active={activeView === 0 || activeView === 1} />
          <SchemaEditorView active={activeView === 2} />
          <SettingsContainer active={activeView === 3} />
        </div>
        <QueryRunner />
        <Notification />
        <ExitDialog open={showClosingDialog} />
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    ...state.navigator,
    ...state.settings,
    transactionControl: state.transactionControl,
    runnerControl: state.runnerControl,
  };
};

const connector = connect(mapStateToProps);

export default connector(withStyles(styles, { withTheme: true })(Root));
