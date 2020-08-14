import React from "react";
import { makeStyles, createStyles } from "@material-ui/styles";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "./Tooltip";
import CircularProgress from "@material-ui/core/CircularProgress";

const useStyles = makeStyles((theme) =>
  createStyles({
    process: {
      width: 48,
      height: 48,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  })
);

const ProcessIconButton = (props: any) => {
  const {
    onClick,
    children,
    loading,
    title,
    disabled,
    color,
    ...others
  } = props;
  const [isLoading, setLoading] = React.useState(false);
  const classes = useStyles();
  const effectiveTitle = React.useMemo(() => (title ? title : ""), [title]);

  const handleClick = React.useCallback(async () => {
    setLoading(true);
    try {
      await onClick();
    } catch (e) {
    }
    setLoading(false);
  }, [onClick]);

  const effectiveLoading = loading === true ? true : isLoading;

  return (
    <div>
      {!effectiveLoading && (
        <Tooltip title={effectiveTitle}>
          <IconButton
            component="span"
            onClick={handleClick}
            {...others}
            disabled={disabled}
          >
            {children}
          </IconButton>
        </Tooltip>
      )}
      {effectiveLoading && (
        <div className={classes.process}>
          <CircularProgress size={24} />
        </div>
      )}
    </div>
  );
};

export default React.memo(ProcessIconButton);
