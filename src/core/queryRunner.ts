import DatabaseConsole, { DB_TYPE } from "./databaseConsole";
import postgresClient, {
  ErrorCode,
  ErrorClassPrefix,
  PostgresResultType,
} from "./postgres";

const ERROR_WHITE_LIST = new Set([ErrorCode.datatype_mismatch]);
const POSTGRES_ERROR_BLACK_LIST = new Set(["stack", "file", "length"]);

export type ResultType = {
  query: QueryType;
  success: boolean;
  fields?: Array<any>;
  rows?: Array<any>;
  elapsed?: [number, number];
  rowsAffected?: number;
  error?: any;
};

export interface QueryType {
  dbType: DB_TYPE;
  schema: string;
  statement: string;
  parameters?: Array<any>;
}

export interface QueriesType {
  oracle?: QueryType;
  postgres?: QueryType;
}

class QueryRunner {
  bindQuery = (query: string, parameters: Array<any>, idSign: string) => {
    const queryParts = query.split("?");
    let paramIndex = 1;
    if (parameters.length !== queryParts.length - 1) {
      throw new Error("Invalid number of parameters.");
    }

    const bindedQuery = queryParts
      .map((q, index) => {
        if (index >= parameters.length) {
          return q;
        }
        const param = parameters[index];
        let type;
        let queries;

        type = idSign === "$" && Number.isInteger(param) ? "::integer" : "";
        queries = `${idSign}${paramIndex++}${type}`;

        return q + queries;
      })
      .join("");

    return bindedQuery;
  };

  mapParameters = (parameters: Array<any>) => {
    return parameters.reduce((agg, p) => {
      if (Array.isArray(p)) {
        agg.push(p);
      } else {
        agg.push(p);
      }
      return agg;
    }, []);
  };

  generateArbitraryParameter = (query: string) => {
    const params = query.match(/\?/g) || [];
    return params.map(() => "1");
  };

  validateQuery = async (queries: QueriesType, schema: string) => {
    if (!queries || !queries.postgres) {
      return { status: "error", error: new Error("No query found...") };
    }
    if (!queries.postgres.parameters) {
      queries.postgres.parameters = this.generateArbitraryParameter(
        queries.postgres.statement
      );
    }

    const ret = await this.runPostgresQuery(
      queries.postgres,
      postgresClient.validate
    );

    if (ret.success) {
      return {
        status: "pass",
      };
    } else {
      return {
        ...ret,
        status:
          !ERROR_WHITE_LIST.has(ret.error.code) &&
          ret.error.code.startsWith(ErrorClassPrefix.syntax_error)
            ? "error"
            : "warning",
      };
    }
  };

  runQuery = async (queries: QueriesType, schema: string) => {
    const [oracleRet, postgresRet] = await Promise.all([
      queries.oracle
        ? await this.runOracleQuery(
            queries.oracle,
            DatabaseConsole.executeOralce
          )
        : { success: false, error: new Error("No oracle query found...") },
      queries.postgres
        ? await this.runPostgresQuery(
            queries.postgres,
            DatabaseConsole.executePostgres
          )
        : { success: false, error: new Error("No postgres query found...") },
    ]);

    if (!oracleRet.success || !postgresRet.success) {
      try {
        await DatabaseConsole.rollback();
      } catch (e) {
      }
    }

    return [oracleRet, postgresRet];
  };

  runOracleQuery = async (
    query: QueryType,
    executeFunc: Function
  ): Promise<ResultType> => {
    const { parameters, schema, statement } = query;    
    let st = statement.replace(/COMPANY_/gi, `${schema}.`);
    const params = parameters || [];

    if (params.length > 0) {
      st = this.bindQuery(st, params, ":");
    }

    try {
      const ret: any = await executeFunc(
        st,
        this.mapParameters(params),
        schema
      );
      return {
        query,
        success: true,
        fields: ret.result.metaData,
        rows: ret.result.rows,
        elapsed: ret.elapsed,
        rowsAffected: ret.result.rowsAffected,
      };
    } catch (e) {
      if (e.offset) {
        const line = this.findLine(st, e.offset);
        if (line !== 0) {
          e.line = line;
        }
      }

      const messageArr: Array<string> = [];
      const error = Object.getOwnPropertyNames(e).reduce((prev: any, name) => {
        const value = e[name];
        if (e[name]) {
          prev[name] = e[name];
          messageArr.push(`${name}: ${value}`);
        }
        return prev;
      }, {});
      error.message = messageArr.join("\n\n");

      return {
        query,
        error,
        success: false,
      };
    }
  };

  findLine = (statement: string, position: number) => {
    const lines = statement.split("\n");
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1;
      if (charCount >= position) {
        return i + 1;
      }
    }
    return 0;
  };

  runPostgresQuery = async (
    query: QueryType,
    executeFunc: any
  ): Promise<ResultType> => {
    const { parameters, schema, statement } = query;
    let st = statement.replace(/COMPANY_/gi, `${schema}.`);
    const params = parameters || [];
    if (params.length > 0) {
      st = this.bindQuery(st, params, "$");
    }

    try {
      const ret: PostgresResultType = await executeFunc(
        st,
        this.mapParameters(params),
        schema
      );
      return {
        query,
        success: true,
        fields: ret.result.fields,
        rows: ret.result.rows,
        elapsed: ret.elapsed,
        rowsAffected:
          ret.result.command !== "SELECT" && ret.result.rowCount != null
            ? ret.result.rowCount
            : undefined,
      };
    } catch (e) {
      if (e.position) {
        const line = this.findLine(st, e.position);
        if (line !== 0) {
          e.line = line;
        }
      }

      const messageArr: Array<string> = [];
      const error = Object.getOwnPropertyNames(e).reduce((prev: any, name) => {
        const value = e[name];
        if (e[name] && !POSTGRES_ERROR_BLACK_LIST.has(name)) {
          prev[name] = e[name];
          messageArr.push(`${name}: ${value}`);
        }
        return prev;
      }, {});
      error.message = messageArr.join("\n\n");

      return {
        query,
        error,
        success: false,
      };
    }
  };
}

export default new QueryRunner();
