import { Divider, Tooltip } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import TableContainer from "@material-ui/core/TableContainer";
import Typography from "@material-ui/core/Typography";
import React from "react";
import Duration from "../apis/duration";
import { DiffResultType } from "../core/dbResultDiff";
import DataTable from "./DataTable";

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    display: "flex",
    height: "100%",
    flexDirection: "column",
    width: "40%",
    backgroundColor: theme.palette.background.default
  },
  normalCell: {},
  errorCell: {
    background: "rgba(239, 83, 80, .5)"
  },
  normalRow: {},
  errorRow: {
    background: "rgba(255,134, 124, .3)"
  },
  container: {
    flex: 1
  },
  stickyColumn: {
    position: "sticky",
    width: 20,
    left: 0,

    top: "auto"
  },
  rangeContainer: {
    flex: 1,
    textAlign: "end"
  },
  footContainer: {
    padding: 10,
    height: 40,
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "row"
  },
  ellipsis: {
    textOverflow: "ellipsis",
    width: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap"
  },
  ellipsisLeft: {
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap"
  }
}));

interface QueryTablePropsType {
  data: DiffResultType;
  diff: boolean;
  height: number;
  width: number;
  iconName: "database" | "postgres";
}

const QueryTable = React.memo((props: QueryTablePropsType) => {
  const classes = useStyles();
  const { data, diff, height, width, iconName } = props;
  const [visibleRows, setVisibleRows]: [string, any] = React.useState("");

  const dataColumns = React.useMemo(() => {
    if (!data || !data.columns) {
      return [];
    }

    const newColumns: Array<any> = data.columns;
    return newColumns.map((c: any, ci: any) => ({
      ...c,
      accessor: (r: any) => `${r.data[ci]}`
    }));
  }, [data]);

  const dataRows = React.useMemo(() => {
    if (!data || !data.rows) {
      return [];
    }

    let newRows: Array<any> = data && data.rows;

    if (diff) {
      newRows = newRows.filter((row) => row.containsError);
    }

    return newRows;
  }, [data, diff]);

  const parameterStr = React.useMemo(
    () => (data.params != null ? JSON.stringify(data.params) : "[]"),
    [data.params]
  );

  const timeElapsedStr = React.useMemo(() => {
    return Duration.toString(data.elapsed);
  }, [data.elapsed]);

  if (!data) {
    return null;
  }

  return (
    <div className={classes.root}>
      <TableContainer className={classes.container}>
        {!data.success && (
          <Typography
            variant='body2'
            style={{
              whiteSpace: "pre-line",
              padding: 10
            }}
            color='error'
          >
            {data.error.message}
          </Typography>
        )}
        {data.success &&
          (!data.rows || data.rows.length === 0) &&
          data.rowsAffected !== undefined && (
            <Typography
              variant='body2'
              style={{
                whiteSpace: "pre-line",
                padding: 10
              }}
            >
              {`Rows affected: ${data.rowsAffected}`}
            </Typography>
          )}
        {data.success && data.columns && data.rows && (
          <DataTable
            dataRows={dataRows}
            dataColumns={dataColumns}
            diff={diff}
            width={width}
            height={height - 42}
            iconName={iconName}
            onItemsRendered={setVisibleRows}
          />
        )}
      </TableContainer>
      {data.success && <Divider />}
      {data.success && (
        <div className={classes.footContainer}>
          <div
            style={{
              display: "flex",
              flex: 1,
              width: "50%",
              whiteSpace: "nowrap"
            }}
          >
            <Tooltip title={`Total Time Elapsed: ${timeElapsedStr}`}>
              <Typography variant='body2'>{timeElapsedStr}</Typography>
            </Tooltip>
            <Tooltip title={`Parameter: ${parameterStr}`}>
              <Typography className={classes.ellipsisLeft} variant='body2'>
                {`, ${parameterStr}`}
              </Typography>
            </Tooltip>
          </div>

          <div className={classes.rangeContainer}>
            <Typography className={classes.ellipsis} variant='body2'>
              {visibleRows.length === 0 ? "0 - 0" : visibleRows} of{" "}
              {dataRows.length}
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
});

export default QueryTable;
