import React from "react";
import Dialog from "@material-ui/core/Dialog";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";

export interface SimpleDialogProps {
  open: boolean;
}

const ExitDialog = (props: SimpleDialogProps) => {
  const { open } = props;

  return (
    <Dialog open={open}>
      <div
        style={{
          height: 200,
          width: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          style={{
            margin: 10,
          }}
        />
        <Typography>Exiting...</Typography>
      </div>
    </Dialog>
  );
};

export default React.memo(ExitDialog);
