/* eslint-disable import/no-webpack-loader-syntax */
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import { createStyles, withStyles } from "@material-ui/styles";
import React from "react";
import { connect } from "react-redux";
import ExitDialog from "../components/ExitDialog";
import DatabaseConsolePage from "../features/databaseConsole/DatabaseConsoleView";
import QueryScanModal from "../features/queryScan/QueryScanModal";
import RunnerResultPanel from "../features/runnerResult/RunnerResultPanel";
import SchemaEditorView from "../features/schemaEditor/SchemaEditorView";
import SettingsPanel from "../features/settings/SettingsPanel";
import { RootState } from "../reducers";
import DiffEditor from "./DiffEditor";
import Navigator from "./Navigator";
import Notification from "./Notification";

const styles: any = () =>
  createStyles({
    rootContainer: {
      height: "calc(100vh - 1px)",
      width: "100vw",
      display: "flex",
      flexDirection: "row",
    },
    rightContainer: {
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 2px)",
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
          <SettingsPanel active={activeView === 3} />
        </div>
        <QueryScanModal />
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
