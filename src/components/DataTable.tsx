import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import clsx from "clsx";
import React, {
  forwardRef,
  ForwardRefRenderFunction,
  useCallback,
  useEffect,
  useRef
} from "react";
import { VariableSizeGrid } from "react-window";
import "./data_table.css";
import SVGIcon from "./SVGIcon";

interface Column {
  name: string;
}

interface Row {
  data: Array<any>;
  errorArray?: Array<boolean>;
  containsError: boolean;
}

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    display: "flex",
    height: "100%",
    flexDirection: "column",
    width: "40%"
  },
  numCell: {
    backgroundColor: theme.palette.background.default
  },
  errorCell: {
    background: "rgba(238, 205, 205, .5)"
  },
  normalRow: {},
  errorRow: {
    background: "rgba(255,134, 124, .3)"
  },
  rangeContainer: {
    flex: 1,
    textAlign: "end"
  },
  footContainer: {
    padding: 10,
    backgroundColor: theme.palette.background.default,
    display: "flex",
    flexDirection: "row"
  },
  container: {
    flex: 1
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    paddingLeft: 10,
    paddingRight: 10,
    borderBottom: "1px solid #eee",
    borderRight: "1px solid #eee"
  },
  cellText: {
    whiteSpace: "pre",
    width: "fit-content"
  },
  dataCell: {
    backgroundColor: "white"
  },
  gutterCell: {
    backgroundColor: "#f8f8f8"
  },
  columnCell: {
    borderBottom: "1px solid #c8c8c8",
    borderRight: "1px solid #c8c8c8"
  },
  bodyContainer: {
    backgroundColor: theme.palette.background.paper
  }
}));

interface QueryTablePropsType {
  dataColumns: Array<any>;
  dataRows: Array<any>;
  diff: boolean;
  height: number;
  width: number;
  iconName: "database" | "postgres";
  onItemsRendered: any;
}

const StickyColumnContext = React.createContext({});

const Cell = React.memo(
  ({ columnIndex, rowIndex, data: { dataRows }, style }: any) => {
    const classes = useStyles();
    const row: any = dataRows[rowIndex];
    const errorArry = row.errorArray;
    const cellHasError = errorArry && errorArry[columnIndex];
    const cell = row.data[columnIndex];

    return (
      <div className={clsx(classes.cell, classes.dataCell)} style={style}>
        <Typography
          className={clsx(classes.cellText)}
          color={cellHasError ? "error" : undefined}
          variant='body2'
        >
          {`${cell}`}
        </Typography>
      </div>
    );
  }
);

const ItemWrapper = React.memo(
  ({ columnIndex, rowIndex, data, style }: any) => {
    if (rowIndex === 0) {
      return null;
    }
    if (columnIndex === 0) {
      return null;
    }

    return (
      <Cell
        columnIndex={columnIndex}
        data={data}
        rowIndex={rowIndex - 1}
        style={style}
      />
    );
  }
);

const HeaderCell = React.memo(
  ({ className, cellData, columnIndex, style, iconName, dataColumns }: any) => {
    const classes = useStyles();

    return (
      <div
        className={clsx(
          classes.cell,
          classes.columnCell,
          classes.gutterCell,
          className
        )}
        style={style}
      >
        {columnIndex === 0 && (
          <SVGIcon name={iconName} width={24} height={24} />
        )}
        {columnIndex > 0 && (
          <Typography
            style={{
              width: "fit-content",
              position: "sticky",
              left: dataColumns[0].width + 10
            }}
            variant='subtitle2'
          >
            {cellData.name}
          </Typography>
        )}
      </div>
    );
  }
);

const StickyHeaderRow = React.memo(({ iconName, style, dataColumns }: any) => {
  return (
    <div className={clsx("sticky")} style={style}>
      {dataColumns.map((column: any, index: number) => (
        <HeaderCell
          key={index}
          className={index === 0 ? "sticky" : undefined}
          cellData={dataColumns[index]}
          dataColumns={dataColumns}
          columnIndex={index}
          iconName={iconName}
          style={{
            width: column.width,
            left: index === 0 ? 0 : undefined,
            top: index === 0 ? 0 : undefined,
            height: 35,
            backgroundColor: "#f8f8f8"
          }}
        />
      ))}
    </div>
  );
});

const StickyColumnCell = React.memo(({ className, cellData, style }: any) => {
  const classes = useStyles();

  return (
    <div
      className={clsx(classes.cell, classes.columnCell, className)}
      style={style}
    >
      <Typography variant='subtitle2'>{`${cellData}`}</Typography>
    </div>
  );
});

interface StickyColumnProps {
  dataRows: any;
  dataColumns: any;
  height: number;
  style: any;
  overscanRowCount: number;
}

interface StickyColumnHandle {
  onScroll: (info: { scrollTop: number }) => void;
}

const StickyColumn: ForwardRefRenderFunction<
  StickyColumnHandle,
  StickyColumnProps
> = ({ dataRows, dataColumns, height, style, overscanRowCount }, ref) => {
  const classes = useStyles();
  const [renderRange, setRenderRange] = React.useState([
    0,
    Math.min(dataRows.length - 1, Math.ceil(height / 35) + overscanRowCount)
  ]);
  const [scrollPos, setScrollPos] = React.useState(0);

  React.useImperativeHandle(
    ref,
    () => ({
      onScroll: ({ scrollTop }: any) => {
        setScrollPos(scrollTop);
      }
    }),
    []
  );

  React.useLayoutEffect(() => {
    let startIndex = Math.min(
        Math.floor(scrollPos / 35) - overscanRowCount,
        dataRows.length - 1
      ),
      endIndex = Math.min(
        Math.ceil((scrollPos + height) / 35) + overscanRowCount,
        dataRows.length - 1
      );
    if (startIndex < 0) {
      startIndex = 0;
    }
    setRenderRange([startIndex, endIndex]);
  }, [dataRows.length, height, overscanRowCount, scrollPos]);

  if (!dataRows || dataRows.length === 0) {
    return null;
  }

  const renderRows = dataRows.slice(renderRange[0], renderRange[1] + 1);

  return (
    <div className={clsx("sticky")} style={style}>
      {renderRows.map((row: any, index: number) => (
        <StickyColumnCell
          className={row.containsError ? classes.errorCell : classes.gutterCell}
          cellData={renderRows[index].data[0]}
          key={renderRows[index].data[0]}
          columnIndex={0}
          style={{
            height: 35,
            width: dataColumns[0].width,
            position: "absolute",
            left: 0,
            top: 35 * (renderRange[0] + index)
          }}
        />
      ))}
    </div>
  );
};

const StickyColumnWithRef = forwardRef(StickyColumn);
const DataTable = React.memo((props: QueryTablePropsType) => {
  const {
    dataColumns,
    dataRows,
    height,
    width,
    iconName,
    onItemsRendered
  } = props;
  const stickyColumnRef = useRef<StickyColumnHandle>(null);
  const gridRef = useRef<VariableSizeGrid>(null);

  const handleItemsRendered = React.useCallback(
    ({ visibleRowStartIndex, visibleRowStopIndex }: any) => {
      onItemsRendered(`${visibleRowStartIndex + 1} - ${visibleRowStopIndex}`);
    },
    [onItemsRendered]
  );

  const totalColumnsWidth = React.useMemo(
    () => dataColumns.reduce((total, dc) => total + dc.width, 0),
    [dataColumns]
  );

  const tableHeight = React.useMemo(() => height, [height]);

  const innerElementType = React.useMemo(
    () =>
      forwardRef(({ children, ...rest }, ref: any) => (
        <div key='innerElement' className='container' ref={ref} {...rest}>
          <StickyHeaderRow
            key='stickyHeader'
            iconName={iconName}
            dataColumns={dataColumns}
            style={{
              top: 0,
              left: 0,
              width: totalColumnsWidth,
              height: 35,
              backgroundColor: "f8f8f8"
            }}
          />
          <div>
            <StickyColumnContext.Consumer>
              {({ displayHeight }: any) => (
                <StickyColumnWithRef
                  key='stickyColumn'
                  ref={stickyColumnRef}
                  dataRows={dataRows}
                  dataColumns={dataColumns}
                  height={displayHeight}
                  overscanRowCount={5}
                  style={{
                    left: 0,
                    top: 0,
                    width: dataColumns[0].width,
                    position: "flex",
                    flexDirection: "column",
                    height: dataRows.length * 35,
                    zIndex: 1
                  }}
                />
              )}
            </StickyColumnContext.Consumer>
            {children}
          </div>
        </div>
      )),
    [dataColumns, dataRows, iconName, totalColumnsWidth]
  );

  const onScroll = useCallback((info: any) => {
    if (stickyColumnRef.current != null) {
      stickyColumnRef.current.onScroll(info);
    }
  }, []);

  useEffect(() => {
    if (gridRef.current != null) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  }, [dataRows]);

  return (
    <StickyColumnContext.Provider value={{ displayHeight: tableHeight }}>
      <VariableSizeGrid
        ref={gridRef}
        className='gridContainer'
        onScroll={onScroll}
        innerElementType={innerElementType}
        columnCount={dataColumns.length}
        columnWidth={(index) => dataColumns[index].width}
        overscanRowCount={10}
        height={tableHeight}
        rowCount={dataRows.length + 1}
        rowHeight={() => 35}
        width={width}
        onItemsRendered={handleItemsRendered}
        itemData={{
          dataRows,
          dataColumns
        }}
      >
        {ItemWrapper}
      </VariableSizeGrid>
    </StickyColumnContext.Provider>
  );
});

export default DataTable;
