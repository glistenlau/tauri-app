import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Typography } from "@material-ui/core";

const LoadingPage = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress
        disableShrink
        style={{
          margin: 10,
        }}
      />
      <Typography>Loading...</Typography>
    </div>
  );
};

export default LoadingPage;
