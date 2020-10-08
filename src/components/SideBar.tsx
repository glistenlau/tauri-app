import { createStyles, makeStyles } from "@material-ui/core/styles";
import React from "react";
import SideBarIcon from "./SideBarIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    sideBar: {
      width: 48,
      height: "calc(100vh - 1px)",
      backgroundColor: "#424242",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0,
    },
    button: {
      marginTop: 10,
      width: 48,
      height: 48,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
  })
);

const SIDE_BAR_ICON_NAMES = ["file", "terminal", "tree", "settings"];

interface SideBarProps {
  activeView: number;
  onValueChange: any;
}

const SideBar = (props: SideBarProps) => {
  const classes = useStyles();
  const { onValueChange, activeView } = props;

  return (
    <div className={classes.sideBar}>
      {SIDE_BAR_ICON_NAMES.map((name, index) => (
        <SideBarIcon
          key={index}
          className={classes.button}
          name={name}
          active={activeView === index}
          onClick={() => onValueChange(index)}
        />
      ))}
    </div>
  );
};

export default SideBar;
