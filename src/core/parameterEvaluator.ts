import QueryRunner, { QueryType } from "./queryRunner";
import OracleClient from "./oracle";
import PgClient from "./postgres";
import { Parameter } from "../containers/QueryRunner";
import { DB_TYPE } from "./databaseConsole";

const SQL_PATERN = /^sql\s*`([\s|\S]*)`$/i;

const extractSqlQuery = (text: string) => {
  const regexResults = SQL_PATERN.exec(text);
  if (regexResults !== null) {
    return regexResults[1];
  }
  return "";
};

export const evaluateParams = async (
  params: Array<Parameter>,
  schema: string,
  evalFunc: any
) => {
  const paramPromises = params.map(async (p) => {
    return await evalFunc(p.raw, schema);
  });
  const paramRets = await Promise.all(paramPromises);

  return params.map((p, i) =>
    Object.assign({}, p, {
      evaluated: paramRets[i],
    })
  );
};

export const evaluateOracle = async (text: string, schema: string) => {
  return await evaluateCommon(
    text,
    schema,
    DB_TYPE.ORACLE,
    async (q: QueryType) =>
      await QueryRunner.runOracleQuery(q, OracleClient.query)
  );
};

export const evaluatePostgres = async (text: string, schema: string) => {
  return await evaluateCommon(
    text,
    schema,
    DB_TYPE.POSTGRES,
    async (q: QueryType) =>
      await QueryRunner.runPostgresQuery(q, PgClient.query)
  );
};

const evaluateCommon = async (text: string, schema: string, dbType:DB_TYPE ,queryFunc: any) => {
  const trimmed = text.trim();
  const statement = extractSqlQuery(trimmed);
  let result = null;
  try {
    if (statement !== "") {
      result = await evaluateSQL(statement, schema, dbType, queryFunc);
    } else {
      result = evaluateJS(trimmed);
    }
  } catch (err) {
    return {
      success: false,
      errorMessage: err.message,
    };
  }

  return {
    success: true,
    value: result,
  };
};

const evaluateJS = (text: string) => {
  let result = (0, eval)(text);

  if (typeof result === "function") {
    result = result();
  }
  if (result === null || result === undefined) {
    return [];
  }
  if (!Array.isArray(result)) {
    result = [result];
  }

  return result;
};

const evaluateSQL = async (
  statement: string,
  schema: string,
  dbType: DB_TYPE,
  queryFunc: any
) => {
  const queryRet = await queryFunc(
    {
      dbType,
      statement,
      schema
    },
    
  );

  if (!queryRet.success) {
    throw queryRet.error;
  }

  return generateListFromQueryResult(queryRet);
};

const generateListFromQueryResult = (qs: any) => {
  return qs.rows.map((r: any) => r[0]);
};

const EVAL_FUNC = [evaluateOracle, evaluatePostgres];

export const evaluateParamsPair = async (
  paramsPair: Array<Array<Parameter>>,
  schema: string
) => {
  const pairPromise = paramsPair.map(async (p, i) => {
    return await evaluateParams(p, schema, EVAL_FUNC[i]);
  });
  return await Promise.all(pairPromise);
};
