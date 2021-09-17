/* eslint-disable import/no-webpack-loader-syntax */
import CssBaseline from "@material-ui/core/CssBaseline";
import Divider from "@material-ui/core/Divider";
import React from "react";
import { connect } from "react-redux";
import styled from "styled-components";
import ExitDialog from "../components/ExitDialog";
import DatabaseConsolePage from "../features/databaseConsole/DatabaseConsoleView";
import DBExplainView from "../features/dbExplain/DBExplainView";
import GraphqlView from "../features/graphql/GraphqlView";
import PropsEditorView from "../features/propsEditor/PropsEditorView";
import QueryScanModal from "../features/queryScan/QueryScanModal";
import RunnerResultPanel from "../features/runnerResult/RunnerResultPanel";
import SchemaEditorView from "../features/schemaEditor/SchemaEditorView";
import SettingsPanel from "../features/settings/SettingsPanel";
import { RootState } from "../reducers";
import Navigator from "./Navigator";
import Notification from "./Notification";


const RootContainer = styled.div`
  height: calc(100vh - 2px);
  width: 100vw;
  display: flex;
  flex-direction: row;
  overflow: hidden;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: "calc(100vh - 2px)";
  width: 80%;
  flex: 1;
`;



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
      <RootContainer>
        <CssBaseline />
        <Navigator />
        <Divider />
        <RightContainer>
          <PropsEditorView active={activeView === 0} />
          <DatabaseConsolePage active={activeView === 1} />
          <RunnerResultPanel active={activeView === 0 || activeView === 1} />
          <SchemaEditorView active={activeView === 2} />
          <SettingsPanel active={activeView === 3} />
          <DBExplainView active={activeView === 4}/>
          <GraphqlView active={activeView === 5} />
        </RightContainer>
        <QueryScanModal />
        <Notification />
        <ExitDialog open={showClosingDialog} />
      </RootContainer>
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

export default connector(Root);
