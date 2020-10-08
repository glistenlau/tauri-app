import { requestAsync } from ".";
import { DBType } from "./sqlCommon";

enum Action {
  ScanQueries = "scanQueries",
}

enum ParameterGenerateStrategy {
  Normal = "normal",
  Cartesian = "cartesian",
}

export interface Query {
  dbType: DBType;
  statement: string;
  parameters?: any[][];
  mode: ParameterGenerateStrategy;
}

class QueryRunner {
  sendRequest = async (action: Action, schemas: string[], queries: Query[]) => {
    const payload: any = {
      schemas,
      queries,
    };

    const rsp = await requestAsync("queryRunner", action, payload);
    if (rsp.success) {
      return rsp.value;
    }
  };

  scanQueries = async (schemas: string[], queries: Query[]) => {
    return await this.sendRequest(Action.ScanQueries, schemas, queries);
  };

  getAllSchemas = async () => {
    const schemas = ["anaconda"];
    const oracleQuery: Query = {
      dbType: DBType.Oracle,
      statement: "select 1 from dual",
      mode: ParameterGenerateStrategy.Normal,
    };
    const postgresQuery: Query = {
      dbType: DBType.Postgres,
      statement: "select 1",
      mode: ParameterGenerateStrategy.Normal,
    };

    return await this.scanQueries(schemas, [oracleQuery, postgresQuery]);
  };
}

export default new QueryRunner();
