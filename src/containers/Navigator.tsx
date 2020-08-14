import React from "react";
import { createStyles, withStyles } from "@material-ui/styles";
import { connect } from "react-redux";

import { changeActiveView } from "../actions";
import SideBar from "../components/SideBar";

const styles: any = (theme: any) =>
  createStyles({
    rootContainer: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      flexDirection: "row",
    },
  });

class Navigator extends React.Component<any, any> {
  handleNavigate = (index: number) => {
    const { dispatch } = this.props;

    dispatch(changeActiveView(index));
  };

  render() {
    const { activeView } = this.props;

    return (
      <SideBar activeView={activeView} onValueChange={this.handleNavigate} />
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    ...state.navigator,
  };
};

const connector = connect(mapStateToProps);

export default connector(withStyles(styles, { withTheme: true })(Navigator));
