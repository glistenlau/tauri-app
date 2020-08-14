import React from "react";
import { createStyles, withStyles } from "@material-ui/styles";
import { connect } from "react-redux";

import {
  changeActiveView,
  connectToOracle,
  connectToPostgres,
  changeOracleSetting,
  changePostgresSetting,
} from "../actions";
import Settings from "../components/Settings";

const styles: any = (theme: any) =>
  createStyles({
    rootContainer: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "row",
    },
  });

class SettingsContainer extends React.Component<any, any> {
  handleNavigate = (index: number) => {
    const { dispatch } = this.props;

    dispatch(changeActiveView(index));
  };

  handleDBConfigChange = async (
    config: any,
    changeDBConfigActionFunc: Function,
    connectDBFunc: Function
  ) => {
    const { dispatch } = this.props;
    dispatch(changeDBConfigActionFunc(config));
    await dispatch(connectDBFunc(config));
  };

  render() {
    const { active, oracleSetting, postgresSetting } = this.props;

    return (
      <Settings
        active={active}
        oracleSetting={oracleSetting}
        postgresSetting={postgresSetting}
        onOracleConfigChange={(config: any) =>
          this.handleDBConfigChange(
            config,
            changeOracleSetting,
            connectToOracle
          )
        }
        onPostgresConfigChange={(config: any) =>
          this.handleDBConfigChange(
            config,
            changePostgresSetting,
            connectToPostgres
          )
        }
      />
    );
  }
}

const mapStateToProps = (state: any, ownProps: any) => {
  return {
    ...ownProps,
    ...state.navigator,
    ...state.settings,
  };
};

const connector = connect(mapStateToProps);

export default connector(
  withStyles(styles, { withTheme: true })(SettingsContainer)
);
