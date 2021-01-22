import React from "react";
import { ReactComponent as CloseSquare } from "../assets/close-square-line.svg";
import { ReactComponent as DatabaseLogo } from "../assets/database-2-fill.svg";
import { ReactComponent as EditFill } from "../assets/edit-box-fill.svg";
import { ReactComponent as FileCopyFill } from "../assets/file-copy-2-fill.svg";
import { ReactComponent as FileLogo } from "../assets/file-copy-2-line.svg";
import { ReactComponent as Graphql } from "../assets/graphql.svg";
import { ReactComponent as MinusSquare } from "../assets/minus-square-line.svg";
import { ReactComponent as PlusSquare } from "../assets/plus-square-line.svg";
import { ReactComponent as PostgresLogo } from "../assets/postgresql_elephant.svg";
import { ReactComponent as PlaneLogo } from "../assets/send-plane-fill.svg";
import { ReactComponent as SettingsLogo } from "../assets/settings-3-line.svg";
import { ReactComponent as TerminalLogo } from "../assets/terminal-box-line.svg";


const getIcon = (name: string, props: any) => {
  switch (name) {
    case "closeSquare":
      return <CloseSquare {...props} />;
    case "editFill":
      return <EditFill {...props} />;
    case "terminal":
      return <TerminalLogo {...props} />;
    case "file":
      return <FileLogo {...props} />;
    case "fileCopyFill":
      return <FileCopyFill {...props} />;
    case "settings":
      return <SettingsLogo {...props} />;
    case "database":
      return <DatabaseLogo fill="#d12e26" {...props} />;
    case "postgres":
      return <PostgresLogo {...props} />;
    case "plane":
      return <PlaneLogo {...props} />;
    case "plusSquare":
      return <PlusSquare {...props} />;
    case "minusSquare":
      return <MinusSquare {...props} />;
    case "graphql":
      return <Graphql {...props} />;
    default:
      return null;
  }
};

interface SVGIconProps {
  className?: any;
  name:
    | "closeSquare"
    | "terminal"
    | "file"
    | "fileCopyFill"
    | "settings"
    | "database"
    | "postgres"
    | "plane"
    | "plusSquare"
    | "minusSquare";
  fill?: any;
  color?: any;
  height?: number;
  width?: number;
  style?: any;
}

const SVGIcon = React.memo(({ name, color, ...otherProps }: SVGIconProps) => {
  const iconProps = React.useMemo(() => {
    if (color === "disabled") {
      return Object.assign({}, otherProps, {
        fill: "#b9b9b9",
      });
    }
    return otherProps;
  }, [color, otherProps]);

  return getIcon(name, iconProps);
});

export default SVGIcon;
