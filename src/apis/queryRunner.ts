import { listen } from "tauri/api/event";
import { requestAsync } from ".";
import { DBType, SQLResult } from "./sqlCommon";

enum Action {
  ScanQueries = "scanQueries",
}

enum ParameterGenerateStrategy {
  Normal = "normal",
  Cartesian = "cartesian",
}

export interface ProgressMessage {
  schema: string;
  index: number;
  parameters: any[] | null;
  finished: number;
  pending: number;
  total: number;
}

export interface ScanSchemaResult {
  parameters: any[] | null;
  progress: { finished: number; total: number; pending: number; elapsed: any };
  results: SQLResult;
}

export interface ScanResult {
  [schema: string]: ScanSchemaResult[];
}

export interface Query {
  dbType: DBType;
  statement: string;
  parameters?: any[][];
  mode: ParameterGenerateStrategy;
}

class QueryRunner {
  scanProgressListeners: ((progress: ProgressMessage) => {})[] = [];

  sendRequest = async (
    action: Action,
    schemas: string[],
    queries: Query[],
    diffResults: boolean
  ) => {
    const payload: any = {
      schemas,
      queries,
      diffResults,
    };

    const rsp = await requestAsync("queryRunner", action, payload);
    console.log(rsp);
    if (rsp.success) {
      return rsp.result;
    }
  };

  scanQueries = async (
    schemas: string[],
    queries: Query[],
    diffResults = true
  ): Promise<ScanResult> => {
    return await this.sendRequest(
      Action.ScanQueries,
      schemas,
      queries,
      diffResults
    );
  };

  getAllSchemas = async (): Promise<[string[], string[]]> => {
    const schemas = ["anaconda"];
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
      mode: ParameterGenerateStrategy.Normal,
    };
    const postgresQuery: Query = {
      dbType: DBType.Postgres,
      statement: `
      select distinct schema_name as schema
      from information_schema.schemata 
      where schema_owner != 'postgres'
      order by schema_name
      `,
      mode: ParameterGenerateStrategy.Normal,
    };

    const result = await this.scanQueries(
      schemas,

      [oracleQuery, postgresQuery],

      false
    );

    const mapped_result = result['anaconda'].map(schemaResult => {
      const sqlResult = schemaResult.results.result;
      if (sqlResult?.rows) {
        return sqlResult.rows.flat();
      }
      return [] as string[];
    });
    return [mapped_result[0], mapped_result[1]]
  };

  addProgressListener = (handler: (progress: ProgressMessage) => {}) => {
    this.scanProgressListeners.push(handler);
  };

  removeProgressListener = (handler: (progress: ProgressMessage) => {}) => {
    const index = this.scanProgressListeners.indexOf(handler);
    if (index === -1) {
      return;
    }

    this.scanProgressListeners.splice(index, 1);
  };

  handleScanProgress = (payload: ProgressMessage) => {
    console.log("scan progress message", payload);
    this.scanProgressListeners.forEach((handler) => handler(payload));
  };
}

const instance = new QueryRunner();
listen<ProgressMessage>("scan_query_progress", ({ payload }) =>
  instance.handleScanProgress(payload)
);

export default instance;
