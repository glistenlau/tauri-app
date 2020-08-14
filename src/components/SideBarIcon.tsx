import React from "react";

import { makeStyles, createStyles } from "@material-ui/core/styles";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import SVGIcon from "./SVGIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    highlightBar: {
      width: 3,
      height: 48,
      position: "absolute",
      left: 0,
      top: 0,
      botom: 0,
      backgroundColor: "#f5f5f5",
    },
  })
);

const iconRenderer = (name: any, fill: string) => {
  switch (name) {
    case "tree": {
      return (
        <AccountTreeOutlinedIcon
          style={{
            width: 36,
            height: 36,
            color: fill,
            cursor: "pointer",
          }}
        />
      );
    }
    default: {
      return (
        <SVGIcon
          name={name}
          fill={fill}
          width={36}
          height={36}
          style={{ cursor: "pointer" }}
        />
      );
    }
  }
};

const SideBarIcon = (props: any) => {
  const { active, name, ...otherProps } = props;
  const [localActive, setLocalActive] = React.useState(false);
  const classes = useStyles();
  const handleMouseOver = React.useCallback(() => {
    setLocalActive(true);
  }, []);
  const handleMouseLeave = React.useCallback(() => {
    setLocalActive(false);
  }, []);

  const effectiveActive = active === true ? true : localActive;
  const fill = effectiveActive ? "#f5f5f5" : "#9e9e9e";

  return (
    <div
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      {...otherProps}
    >
      {active && <div className={classes.highlightBar} />}
      {iconRenderer(name, fill)}
    </div>
  );
};

export default SideBarIcon;
