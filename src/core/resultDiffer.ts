import { ResultType, QueryType } from "./queryRunner";

export interface DiffMap {
  [rowIndex: number]: Array<number>;
}
export interface DiffResult {
  queryResult: Array<ResultType>;
  diffRowCount: number;
  diffMapList?: Array<DiffMap>;
}
class ResultDiffer {
  fetchNext: () => Promise<ResultType[]> = null;
  handleDiffNew: (queryResultList: ResultType[]) => void = null;
  handleDiffFinish: (queryResultList: ResultType[]) => void = null;
  count: number = null;
  total: number = 0;
  finalResultResolver: any = null;
  sortResult: boolean = false;

  constructor(total: number, sortResult?: boolean) {
    this.total = total;
    this.sortResult = sortResult;
  }

  setFetchNext = (fn: any) => {
    this.fetchNext = fn;
  };

  onDiffNew = (fn: (queryResult: ResultType[]) => void) => {
    this.handleDiffNew = fn;
  };

  onDiffFinish = (fn: (queryResult: ResultType[]) => void) => {
    this.handleDiffFinish = fn;
  };

  start = async () => {
    let diffResult;
    while (this.count > 0) {
      const queryResult = await this.fetchNext();
      if (this.handleDiffNew) {
        this.handleDiffNew(queryResult);
      }

      // start diff query results
      diffResult = await this.diffQueryResult(queryResult);
      if (this.handleDiffFinish) {
        this.handleDiffFinish(queryResult);
      }

      if (diffResult !== null) {
        return this.resolveFinalResult(diffResult);
      }
      this.count--;
    }
    this.resolveFinalResult(diffResult);
  };

  waitDiffResult = (): Promise<DiffResult> =>
    new Promise((resolve, reject) => {
      this.finalResultResolver = [resolve, reject];
    });

  resolveFinalResult = (diffResult: DiffResult) => {
    const [resolve, reject] = this.finalResultResolver;
    resolve(diffResult);
  };

  diffQueryResult = async (queryResult: ResultType[]): Promise<DiffResult> => {
    const columnIndexMap: any = {};
    queryResult.forEach((qr, index) => {
      this.buildColumnIndexMap(
        columnIndexMap,
        qr.fields,
        index,
        queryResult.length
      );
      if (this.sortResult) {
        qr?.rows?.sort();
      }
    });
    const len = queryResult.reduce(
      (max, cur) => (cur?.rows ? Math.max(cur.rows.length, max) : max),
      0
    );

    let diffCount = 0;
    let rowNum = 0;
    const diffResults = queryResult.map(() => ({}));

    while (rowNum < len) {
      const endRowNum = Math.min(len, rowNum + 1000);
      diffCount += await this.compareRows(
        queryResult,
        columnIndexMap,
        diffResults,
        rowNum,
        endRowNum
      );
      rowNum = endRowNum;
    }

    const returnRet: DiffResult = {
      diffRowCount: diffCount,
      queryResult,
    };

    if (diffCount > 0) {
      returnRet.diffMapList = diffResults;
    }

    return returnRet;
  };

  compareRows = (
    queryResults: ResultType[],
    columnIndexMap: any,
    diffResults: any[],
    start: number,
    end: number
  ): Promise<number> =>
    new Promise((resolve, reject) => {
      let diffCount = 0;
      for (let rowNum = start; rowNum < end; rowNum++) {
        const rowList = queryResults.map((qr) =>
          qr?.rows ? qr.rows[rowNum] : undefined
        );
        if (this.compareRow(rowList, columnIndexMap, diffResults, rowNum)) {
          diffCount++;
        }
      }
      resolve(diffCount);
    });

  compareRow = (
    rowList: any[],
    columnIndexMap: { [key: string]: Array<any> },
    diffResults: any[],
    rowIndex: number
  ) => {
    let foundDiff = rowList.some((row) => row == null);

    Object.keys(columnIndexMap).forEach((colName) => {
      const indexes = columnIndexMap[colName];
      const vals: string[] = rowList.map((row, index) => {
        const ci = indexes[index];
        const ov = `${ci != null && row ? row[ci] : undefined}`;
        return ov;
      });

      const aggVal = vals.reduce((pre, cur) => {
        if (pre == null) {
          return pre;
        }
        return pre === cur ? cur : null;
      });

      if (aggVal == null) {
        foundDiff = true;
        diffResults.forEach((diffRet, i) => {
          const ci = indexes[i];
          if (ci != null && rowList[i]) {
            const cellDiffSet = diffRet[rowIndex] || [];
            cellDiffSet.push(ci);
            diffRet[rowIndex] = cellDiffSet;
          }
        });
      }
    });

    return foundDiff;
  };

  buildColumnIndexMap = (
    columnIndexMap: any,
    fields: Array<any>,
    i: number,
    len: number
  ) => {
    if (!fields) {
      return;
    }

    fields.forEach((col: any, index: number) => {
      let colName: string = col.name.toLowerCase();
      let indexes;

      if (colName in columnIndexMap) {
        indexes = columnIndexMap[colName];
      } else {
        indexes = new Array(len);
      }

      if (indexes[i] != null) {
        colName = `${colName}-${i}`;
        indexes = columnIndexMap[colName] || new Array(len);
      }

      indexes[i] = index;
      columnIndexMap[colName] = indexes;
    });
  };
}

export default ResultDiffer;
