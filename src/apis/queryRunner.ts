import { listen } from "tauri/api/event";
import { requestAsync } from ".";
import Duration from "./duration";
import { DBType, SQLResult } from "./sqlCommon";

enum Action {
  ScanQueries = "scanQueries"
}

export enum ParameterGenerateStrategy {
  Normal = "normal",
  Cartesian = "cartesian"
}

export interface ScanProcess {
  parameters: any[] | null;
  finished: number;
  pending: number;
  total: number;
}

export interface ProgressMessage extends ScanProcess {
  schema: string;
  index: number;
}

export interface ScanSchemaQueryResult {
  parameters: any[] | null;
  progress: {
    finished: number;
    total: number;
    pending: number;
    elapsed: Duration;
  };
  results: SQLResult;
}

export interface ScanSchemaResult {
  queryResults: (ScanSchemaQueryResult | null)[];
  diffResults?: { [row: number]: number[] };
}

export interface ScanResult {
  [schema: string]: ScanSchemaResult;
}

export interface Query {
  dbType: DBType;
  statement: string;
  parameters?: any[][];
  mode: ParameterGenerateStrategy;
}

class QueryRunner {
  scanProgressListeners: ((progress: ProgressMessage) => void)[] = [];
  scanSchemaResultListeners: ((
    progress: [string, ScanSchemaResult]
  ) => void)[] = [];

  sendRequest = async (
    action: Action,
    schemaQueries: { [schema: string]: Query[] },
    diffResults: boolean
  ) => {
    const payload: any = {
      schemaQueries,
      diffResults
    };

    const rsp = await requestAsync("queryRunner", action, payload);
    console.log(rsp);
    if (rsp.success) {
      return rsp.result;
    }
  };

  scanQueries = async (
    schemaQueries: { [schema: string]: Query[] },
    diffResults = true
  ): Promise<ScanResult> => {
    return await this.sendRequest(
      Action.ScanQueries,
      schemaQueries,
      diffResults
    );
  };

  getAllSchemas = async (): Promise<[string[], string[]]> => {
    const oracleQuery: Query = {
      dbType: DBType.Oracle,
      statement: `
      select distinct owner as schema
      from dba_segments
      where owner in (
        select username
        from dba_users
        where default_tablespace not in ('SYSTEM','SYSAUX')
      )
      order by owner`,
      mode: ParameterGenerateStrategy.Normal
    };
    const postgresQuery: Query = {
      dbType: DBType.Postgres,
      statement: `
      select distinct schema_name as schema
      from information_schema.schemata 
      where schema_owner != 'postgres'
      order by schema_name
      `,
      mode: ParameterGenerateStrategy.Normal
    };

    const result = await this.scanQueries(
      { anaconda: [oracleQuery, postgresQuery] },
      false
    );

    const mapped_result = result["anaconda"].queryResults.map(
      (schemaResult) => {
        const sqlResult = schemaResult?.results.result;
        if (sqlResult?.rows) {
          return sqlResult.rows.flat();
        }
        return [] as string[];
      }
    );
    return [mapped_result[0], mapped_result[1]];
  };

  addProgressListener = (handler: (progress: ProgressMessage) => void) => {
    this.scanProgressListeners.push(handler);
  };

  removeProgressListener = (handler: (progress: ProgressMessage) => void) => {
    const index = this.scanProgressListeners.indexOf(handler);
    if (index === -1) {
      return;
    }

    this.scanProgressListeners.splice(index, 1);
  };

  addSchemaResultListener = (
    handler: (progress: [string, ScanSchemaResult]) => void
  ) => {
    this.scanSchemaResultListeners.push(handler);
  };

  removeSchemaResultListener = (
    handler: (progress: [string, ScanSchemaResult]) => void
  ) => {
    const index = this.scanSchemaResultListeners.indexOf(handler);
    if (index === -1) {
      return;
    }

    this.scanSchemaResultListeners.splice(index, 1);
  };

  handleScanProgress = (payload: ProgressMessage) => {
    this.scanProgressListeners.forEach((handler) => handler(payload));
  };

  handleScanSchemaResult = (payload: [string, ScanSchemaResult]) => {
    this.scanSchemaResultListeners.forEach((handler) => handler(payload));
  };
}

const instance = new QueryRunner();
listen<ProgressMessage>("scan_query_progress", ({ payload }) =>
  instance.handleScanProgress(payload)
);
listen<[string, ScanSchemaResult]>("scan_query_schema_result", ({ payload }) =>
  instance.handleScanSchemaResult(payload)
);

export default instance;
