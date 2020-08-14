import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import QueryTable from "./QueryTable";

import { TimeElapsedPair } from "../reducers/queryRunner";
import { DiffResultType } from "../core/dbResultDiff";

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default,
    flex: 1,
    display: "flex",
    flexDirection: "row",
    width: "100%",
  },
  tableContainer: {
    backgroundColor: theme.palette.background.paper,
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "40%",
  },
  hide: {
    height: 0,
  },
}));

interface SplitQueryTableProps {
  height: number;
  width: number;
  data: [DiffResultType, DiffResultType];
  show: boolean;
  diff: boolean;
  parameters: Array<any>;
  timeElapsedPair: TimeElapsedPair;
}

const SplitQueryTable = React.memo((props: SplitQueryTableProps) => {
  const classes = styles();
  const {
    data,
    diff,
    height,
    width,
    show,
    parameters,
    timeElapsedPair,
  } = props;
  const tableWidth = React.useMemo(() => Math.floor((width - 12) / 2), [width]);

  return (
    <div className={show ? classes.container : classes.hide} style={{ height }}>
      {data &&
        data.map((d, i) => (
          <div
            key={i}
            className={classes.tableContainer}
            style={{
              marginRight: i !== data.length - 1 ? 10 : 0,
            }}
          >
            {i === data.length - 1 && (
              <Divider orientation="vertical" flexItem />
            )}
            <QueryTable
              diff={diff}
              data={d}
              height={height}
              width={tableWidth}
              iconName={i === 0 ? "database" : "postgres"}
              parameter={parameters[i]}
              timeElapsed={timeElapsedPair[i]}
            />
            {i !== data.length - 1 && (
              <Divider orientation="vertical" flexItem />
            )}
          </div>
        ))}
    </div>
  );
});

export default SplitQueryTable;
