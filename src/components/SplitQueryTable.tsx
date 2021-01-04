import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import React, { useMemo } from "react";
import { ScanSchemaResult } from "../apis/queryRunner";
import { mapToView } from "../core/dbResultDiff";
import QueryTable from "./QueryTable";

const styles = makeStyles((theme) => ({
  container: {
    backgroundColor: theme.palette.background.default,
    flex: 1,
    display: "flex",
    flexDirection: "row",
    width: "100%"
  },
  tableContainer: {
    backgroundColor: theme.palette.background.paper,
    flex: 1,
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "40%"
  },
  hide: {
    height: 0
  }
}));

interface SplitQueryTableProps {
  height: number;
  width: number;
  show: boolean;
  diff: boolean;
  value?: ScanSchemaResult;
}

const SplitQueryTable = React.memo((props: SplitQueryTableProps) => {
  const classes = styles();
  const { diff, height, width, show, value } = props;
  const tableWidth = React.useMemo(() => Math.floor((width - 12) / 2), [width]);

  const queryData = useMemo(() => mapToView(value), [value]);
  const queryLen = useMemo(() => queryData.viewValues.length, [queryData.viewValues.length]);

  return (
    <div className={show ? classes.container : classes.hide} style={{ height }}>
      {queryData.viewValues.map((d, i) => (
        <div
          key={i}
          className={classes.tableContainer}
          style={{
            marginRight: i !== queryLen - 1 ? 10 : 0
          }}
        >
          {i === queryLen - 1 && (
            <Divider orientation='vertical' flexItem />
          )}
          <QueryTable
            diff={diff}
            data={d}
            height={height}
            width={tableWidth}
            iconName={i === 0 ? "database" : "postgres"}
          />
          {i !== queryLen - 1 && (
            <Divider orientation='vertical' flexItem />
          )}
        </div>
      ))}
    </div>
  );
});

export default SplitQueryTable;
