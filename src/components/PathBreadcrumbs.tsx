import { Link } from "@material-ui/core";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import KeyboardArrowRightIcon from "@material-ui/icons/KeyboardArrowRight";
import React from "react";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    separator: {
      marginLeft: 0,
      marginRight: 0,
    },
    ol: {
      width: "max-content",
    },
  })
);

interface Path {
  value: (isActive?: boolean) => any;
  id: string;
}

interface PathBreadcrumbsProps {
  paths: Array<Path>;
  onClick?: any;
  className?: string;
}

const PathBreadcrumbs = ({
  onClick,
  paths,
  ...otherProps
}: PathBreadcrumbsProps) => {
  const classes = useStyles();

  const handleClick = React.useCallback(
    (id) => {
      if (onClick) onClick(id);
    },
    [onClick]
  );

  const links = React.useMemo(
    () =>
      paths
        .filter((path) => path !== null)
        .map((path, index, arr) => {
          if (index !== arr.length - 1) {
            return (
              <Link
                key={path.id}
                color="inherit"
                href="#"
                onClick={() => handleClick(path.id)}
              >
                {path.value()}
              </Link>
            );
          } else {
            return path.value(true);
          }
        }),
    [handleClick, paths]
  );

  if (!paths || paths.length === 0) {
    return null;
  }

  return (
    <div {...otherProps}>
      <Breadcrumbs
        classes={{ ol: classes.ol, separator: classes.separator }}
        separator={<KeyboardArrowRightIcon fontSize="small" />}
      >
        {links}
      </Breadcrumbs>
    </div>
  );
};

export default React.memo(PathBreadcrumbs);
