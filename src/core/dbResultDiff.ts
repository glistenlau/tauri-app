import { getTextWidth } from "../util";
import { ResultType } from "./queryRunner";

const HEADER_FONT = "700 14px Source Code Pro";
const ROW_FONT = "400 14px Source Code Pro";
const EXTRA_WIDTH = 41;

export type ProcessedRowType = {
  data: Array<any>;
  containsError: boolean;
  errorArray?: Array<boolean>;
};

export type DiffResultType = {
  success: boolean;
  elapsed?: [number, number];
  columns?: Array<any>;
  rows?: Array<ProcessedRowType>;
  error?: any;
  rowsAffected?: any;
};

export type DiffResultViewType = {
  diffCount: number;
  rowCount: number;
  viewValues: [DiffResultType, DiffResultType];
};

export function diffAndMapToView(
  oracleResult: ResultType,
  postgresResult: ResultType,
  sortReulsts?: boolean
): DiffResultViewType {
  const columnIndexMap: any = {};
  const processedOraRows: Array<any> = [];
  const processedPgRows: Array<any> = [];

  buildIndexMap(columnIndexMap, oracleResult && oracleResult.fields, 0);
  buildIndexMap(columnIndexMap, postgresResult && postgresResult.fields, 1);
  const oracleHeadersWidth = getHeadersWidth(
    oracleResult && oracleResult.fields
  );
  const postgresHeadersWidth = getHeadersWidth(
    postgresResult && postgresResult.fields
  );

  const oraRowLen =
    (oracleResult && oracleResult.rows && oracleResult.rows.length) || 0;
  const pgRowLen =
    (postgresResult && postgresResult.rows && postgresResult.rows.length) || 0;

  if (sortReulsts) {
    if (oracleResult && oracleResult.rows) {
      oracleResult.rows.sort();
    }
    if (postgresResult && postgresResult.rows) {
      postgresResult.rows.sort();
    }
  }

  const len = Math.max(oraRowLen, pgRowLen);
  let diffCount = 0;

  for (let rowNum = 0; rowNum < len; rowNum++) {
    const oracleRow =
      oracleResult && oracleResult.rows && oracleResult.rows[rowNum];
    const postgresRow =
      postgresResult && postgresResult.rows && postgresResult.rows[rowNum];

    const foundDiff = compareRow(
      oracleRow,
      postgresRow,
      columnIndexMap,
      rowNum,
      processedOraRows,
      processedPgRows,
      oracleHeadersWidth,
      postgresHeadersWidth
    );
    if (foundDiff) {
      diffCount++;
    }
  }

  const oraData = generateProcessedResult(
    oracleResult,
    processedOraRows,
    oracleHeadersWidth
  );
  const pgData = generateProcessedResult(
    postgresResult,
    processedPgRows,
    postgresHeadersWidth
  );

  return {
    diffCount,
    rowCount: len,
    viewValues: [
      oraData ? oraData : oracleResult,
      pgData ? pgData : postgresResult,
    ],
  };
}

const getHeadersWidth = (headers: Array<any>) => {
  if (!headers) {
    return [];
  }
  return headers.map((header) => getTextWidth(header.name, HEADER_FONT) + 40);
};

const generateProcessedResult = (
  originResult: ResultType,
  processedRows: Array<any>,
  headersWidth: Array<number>
) => {
  const ret: any = originResult &&
    originResult.fields &&
    originResult.fields.length > 0 && {
      success: originResult.success,
      elapsed: originResult.elapsed,
      columns: [
        {
          name: "",
          id: "-1",
          sticky: "left",
          width:
            getTextWidth(`${processedRows.length}`, HEADER_FONT) + EXTRA_WIDTH,
        },
        ...originResult.fields.map((f: any, i: number) => ({
          ...f,
          width: headersWidth[i],
          id: `${i}`,
        })),
      ],
      rows: processedRows,
    };

  if (ret && originResult && originResult.error) {
    ret.error = originResult.error;
  }

  if (ret && originResult && originResult.rowsAffected !== undefined) {
    ret.rowsAffected = originResult.rowsAffected;
  }

  return ret;
};

const buildIndexMap = (columnIndexMap: any, fields: Array<any>, i: number) => {
  if (!fields) return;

  fields.forEach((col: any, index: number) => {
    let colName: string = col.name.toLowerCase();
    let indexes;

    if (colName in columnIndexMap) {
      indexes = columnIndexMap[colName];
    } else {
      indexes = [null, null];
    }

    if (indexes[i] !== null) {
      colName = `${colName}-${i}`;
      indexes = columnIndexMap[colName] || [null, null];
    }

    indexes[i] = index;
    columnIndexMap[colName] = indexes;
  });
};

const buildViewRow = (
  rowData: Array<any>,
  containsError: boolean,
  errorRow: Array<boolean>,
  rowIndex: number
) => {
  const newRow: any = {
    data: [rowIndex + 1, ...rowData],
    containsError,
  };

  if (containsError) {
    newRow.errorArray = [false, ...errorRow];
  }

  return newRow;
};

function compareRow(
  or: any,
  pr: any,
  colIndex: { [key: string]: Array<any> },
  rowIndex: number,
  processedOraRows: Array<Array<any>>,
  processedPgRows: Array<Array<any>>,
  oraHeadersWidth: Array<number>,
  pgHeadersWidth: Array<number>
) {
  let foundDiff = !or || !pr;

  const oraErrorArr = or && or.map(() => false);
  const pgErrorArr = pr && pr.map(() => false);

  Object.keys(colIndex).forEach((colName) => {
    const indexes = colIndex[colName];
    const oi = indexes[0];
    const pi = indexes[1];
    const ov = oi !== null && or ? or[oi] : undefined;
    const pv = pi !== null && pr ? pr[pi] : undefined;

    const osv = `${ov}`;
    const psv = `${pv}`;

    if (oi !== null) {
      oraHeadersWidth[oi] = Math.max(
        oraHeadersWidth[oi],
        getTextWidth(osv, ROW_FONT) + EXTRA_WIDTH
      );
    }

    if (pi !== null) {
      pgHeadersWidth[pi] = Math.max(
        pgHeadersWidth[pi],
        getTextWidth(psv, ROW_FONT) + EXTRA_WIDTH
      );
    }

    if (ov !== undefined && osv !== psv) {
      foundDiff = true;
      oraErrorArr[oi] = true;
      if (pv !== undefined) {
        pgErrorArr[pi] = true;
      }
    }
  });

  if (or) {
    processedOraRows.push(buildViewRow(or, foundDiff, oraErrorArr, rowIndex));
  }

  if (pr) {
    processedPgRows.push(buildViewRow(pr, foundDiff, pgErrorArr, rowIndex));
  }

  return foundDiff;
}
