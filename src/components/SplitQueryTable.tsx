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
    width: "100%",
  },
  tableContainer: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    flexDirection: "row",
    height: "100%",
    width: "10%",
  },
  hideContainer: {
    height: 0,
    width: 0,
    overflow: "hidden",
  },
  hide: {
    height: 0,
  },
}));

interface SplitQueryTableProps {
  height: number;
  width: number;
  show: boolean;
  diff: boolean;
  resultActivePair: [boolean, boolean];
  value?: ScanSchemaResult;
}

const SplitQueryTable = React.memo((props: SplitQueryTableProps) => {
  const classes = styles();
  const { diff, height, width, show, value, resultActivePair } = props;
  const tableWidth = React.useMemo(() => {
    if (resultActivePair.filter(Boolean).length === 2 || diff) {
      return Math.floor((width - 12) / 2);
    }
    return width;
  }, [diff, resultActivePair, width]);

  const queryData = useMemo(() => mapToView(value), [value]);
  const queryLen = useMemo(
    () => queryData.viewValues.length,
    [queryData.viewValues.length]
  );
  const needDivider = useMemo(() => {
    let hasDataRendered = false;
    return resultActivePair.map((ra) => {
      if (!ra && !diff) {
        return false;
      }
      if (!hasDataRendered) {
        hasDataRendered = true;
        return false;
      }
      return true;
    });
  }, [diff, resultActivePair]);

  return (
    <div className={show ? classes.container : classes.hide} style={{ height }}>
      {queryData.viewValues.map((d, i) => {
        const isActive = resultActivePair[i] || diff;
        return (
          <div
            key={i}
            className={
              isActive ? classes.tableContainer : classes.hideContainer
            }
            style={{ width: tableWidth + (needDivider[i] ? 12 : 0) }}
          >
            {needDivider[i] && (
              <Divider
                style={{ marginRight: 10 }}
                orientation="vertical"
                flexItem
              />
            )}
            {needDivider[i] && <Divider orientation="vertical" flexItem />}
            <QueryTable
              diff={diff}
              data={d}
              height={height}
              width={tableWidth}
              iconName={i === 0 ? "database" : "postgres"}
            />
          </div>
        );
      })}
    </div>
  );
});

export default SplitQueryTable;
