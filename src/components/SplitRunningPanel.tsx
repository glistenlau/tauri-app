import Divider from "@material-ui/core/Divider";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { ScanProcess } from "../apis/queryRunner";
import SVGIcon from "./SVGIcon";

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default,
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "80%",
    width: "100%",
  },
  tableContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "40%",
  },
  content: {
    flex: 1,
    display: "flex",
    height: "100%",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "40%",
  },
  hide: {
    height: 0,
  },
  process: {
    width: "50%",
    marginTop: 10,
  },
  ellipsis: {
    textOverflow: "ellipsis",
    width: "10%",
    flex: 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textAlign: "center",
  },
}));

interface SplitRunningPanelProps {
  runningProgress?: [ScanProcess, ScanProcess];
  show: boolean;
}

const SplitRunningPanel = (props: SplitRunningPanelProps) => {
  const classes = styles();
  const { show, runningProgress } = props;

  return (
    <div className={show ? classes.container : classes.hide}>
      {runningProgress &&
        runningProgress.map((progress, i) => (
          <div key={i} className={classes.tableContainer}>
            <div className={classes.content}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 10,
                  width: "100%",
                }}
              >
                <Typography className={classes.ellipsis}>
                  <SVGIcon
                    width={20}
                    height={20}
                    name={i === 0 ? "database" : "postgres"}
                    style={{ marginRight: 10 }}
                  />

                  {`Running query with parameters ${JSON.stringify(
                    progress.parameters
                  )} ...`}
                </Typography>
              </div>
              {progress.total > 0 && (
                <LinearProgress
                  className={classes.process}
                  variant="buffer"
                  value={(progress.finished / progress.total) * 100}
                  valueBuffer={
                    (100 * (progress.finished + progress.pending)) /
                    progress.total
                  }
                  color={i === 0 ? "secondary" : "primary"}
                />
              )}
            </div>
            <Divider orientation="vertical" flexItem />
          </div>
        ))}
    </div>
  );
};

export default SplitRunningPanel;
