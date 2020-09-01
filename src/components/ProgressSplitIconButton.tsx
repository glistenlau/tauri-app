import React, { useMemo, useCallback } from "react";
import { makeStyles, createStyles } from "@material-ui/styles";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import CircularProgress from "@material-ui/core/CircularProgress";
import {
  ButtonGroup,
  Button,
  Popper,
  Grow,
  Paper,
  ClickAwayListener,
  MenuList,
  MenuItem,
} from "@material-ui/core";

const useStyles = makeStyles((theme) =>
  createStyles({
    process: {
      width: 48,
      height: 48,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    grouped: {
      minWidth: 0,
    },
  })
);

interface ProcessSplitIconButtonProps {
  children: any;
  loading: boolean;
  disabled: boolean;
  options: any[];
  onClick: () => void;
  onSelectItem: (index: number) => void;
  containerStyle: any;
}

const ProcessSplitIconButton = (props: ProcessSplitIconButtonProps) => {
  const {
    onClick,
    options,
    children,
    loading,
    disabled,
    onSelectItem,
    containerStyle,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [isLoading, setLoading] = React.useState(false);
  const classes = useStyles();
  const anchorRef = React.useRef(null as HTMLButtonElement | null);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      await onClick();
    } catch (e) {}
    setLoading(false);
  }, [onClick]);

  const handleToggle = useCallback(() => {
    setOpen((prevOpen) => !prevOpen);
  }, []);

  const handleMenuItemClick = useCallback(
    async (e, index) => {
      setOpen(false);
      setLoading(true);
      try {
        await onSelectItem(index);
      } catch (e) {}
      setLoading(false);
    },
    [onSelectItem]
  );

  const handleClose = useCallback((event) => {
    if (anchorRef.current?.contains(event.target)) {
      return;
    }

    setOpen(false);
  }, []);

  const effectiveLoading = useMemo(
    () => (loading === true ? true : isLoading),
    [isLoading, loading]
  );

  const menuList = useMemo(
    () => (
      <ClickAwayListener onClickAway={handleClose}>
        <MenuList id="split-button-menu">
          {options.map((option, index) => (
            <MenuItem
              key={option}
              onClick={(event) => handleMenuItemClick(event, index)}
            >
              {option}
            </MenuItem>
          ))}
        </MenuList>
      </ClickAwayListener>
    ),
    [handleClose, handleMenuItemClick, options]
  );

  return (
    <div style={containerStyle}>
      <ButtonGroup
        disabled={disabled}
        classes={{
          grouped: classes.grouped,
        }}
        variant="outlined"
        size="small"
        aria-label="split button"
      >
        <Button onClick={handleClick}>
          {!effectiveLoading && children}
          {effectiveLoading && <CircularProgress size={24} />}
        </Button>
        <Button
          ref={anchorRef}
          onClick={handleToggle}
          style={{
            padding: 0,
          }}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        style={{
          zIndex: 20,
        }}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper
              style={{
                zIndex: 20,
              }}
            >
              {menuList}
            </Paper>
          </Grow>
        )}
      </Popper>
    </div>
  );
};

export default React.memo(ProcessSplitIconButton);
