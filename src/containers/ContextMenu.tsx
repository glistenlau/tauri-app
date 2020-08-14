import React from "react";
import { connect } from "react-redux";
const { Menu, MenuItem } = remote;

class ContextMenu extends React.Component<any, any> {
  menu: any;

  constructor(props: any) {
    super(props);
    this.menu = new Menu();
  }

  componentDidMount() {
    this.menu.append(
      new MenuItem({
        label: "Copy the Oracle Properties file path",
        click: () => this.handleCopyClassPath("oracle"),
      })
    );
    this.menu.append(
      new MenuItem({
        label: "Copy the Postgres Properties file path",
        click: () => this.handleCopyClassPath("oracle"),
      })
    );

    this.menu.append(
      new MenuItem({
        label: "Copy the Current Property Name",
        click: this.handleCopyPropName,
      })
    );

    window.addEventListener("contextmenu", this.handleContextMenu, false);
  }

  componentWillUnmount() {
    window.removeEventListener("contextmenu", this.handleContextMenu);
  }

  handleCopyClassPath = (dbName: string) => {
    const { selectedClassPath } = this.props;
    clipboard.write({ text: `${selectedClassPath}.${dbName}.properties` });
  };

  handleCopyPropName = () => {
    const { selectedPropName } = this.props;
    clipboard.write({ text: selectedPropName });
  };

  handleContextMenu = (e: any) => {
    e.preventDefault();
    this.menu.popup({ window: remote.getCurrentWindow() });
  };

  render(): any {
    return null;
  }
}

const mapStateToProps = (state: any) => {
  return {
    selectedClassPath: state.editor.selectedClassPath,
    selectedPropName: state.editor.selectedPropName,
  };
};

export default connect(mapStateToProps)(ContextMenu);
