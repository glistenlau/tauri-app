import { executeStmt } from "../apis/graphql/sql";
import { SQLResult } from "../apis/sqlCommon";
import { Parameter } from "../features/queryScan/queryScanSlice";
import { Dbtype, ExecuteStmtQuery } from "../generated/graphql";
import { isEmptyObjectOrNull, stringifySqlError } from "../util";
import { DB_TYPE } from "./databaseConsole";

const SQL_PATERN = /^sql\s*`([\s|\S]*)`$/i;

function sql(strings: TemplateStringsArray) {
  return { value: strings.raw[0], type: "sql" };
}

const extractSqlQuery = (text: string) => {
  const regexResults = SQL_PATERN.exec(text);
  if (regexResults !== null) {
    return regexResults[1];
  }
  return "";
};

export const evaluateRawParams = async (
  params: Array<Parameter>,
  schema: string,
  evalFunc: any
) => {
  const paramPromises = params.map(async (p) => {
    if (!isEmptyObjectOrNull(p.evaluated)) {
      return p.evaluated;
    }
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
    (statement: string) =>
      executeStmt(Dbtype.Oracle, [], schema, statement, false)
  );
};

export const evaluatePostgres = async (text: string, schema: string) => {
  return await evaluateCommon(
    text,
    schema,
    DB_TYPE.POSTGRES,
    (statement: string) =>
      executeStmt(Dbtype.Postgres, [], schema, statement, false)
  );
};

const evaluateCommon = async (
  text: string,
  schema: string,
  dbType: DB_TYPE,
  queryFunc: (statement: string) => Promise<ExecuteStmtQuery>
) => {
  const trimmed = text.trim();
  try {
    let evaled: any = extractSqlQuery(trimmed);
    if (evaled) {
      if (!schema) {
        throw new Error("No Schmea Specified.");
      }
      evaled = await evaluateSQL(evaled, schema, dbType, queryFunc);
    } else {
      evaled = evaluateJS(trimmed);
    }
    return {
      success: true,
      value: evaled,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message,
    };
  }
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
  queryFunc: (statement: string) => Promise<ExecuteStmtQuery>
) => {
  try {
    const sqlResponse: any = await queryFunc(statement);
    return generateListFromResultSet(sqlResponse);
  } catch (e: any) {
    throw new Error(e.message);
  }
};

const generateListFromResultSet = (rs?: SQLResult) => {
  if (!rs) {
    return [];
  }
  if (rs.error) {
    throw new Error(stringifySqlError(rs.error));
  }
  if (rs.result) {
    return rs.result.rows?.map((r) => r[0]) || [];
  }
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
    return await evaluateRawParams(p, schema, EVAL_FUNC[i]);
  });
  return await Promise.all(pairPromise);
};

export const evaluateRawParamsPair = async (
  paramsPair: Array<Array<Parameter>>,
  schema: string
): Promise<[Parameter[], Parameter[]]> => {
  if (
    paramsPair[0].filter((param) => isEmptyObjectOrNull(param.evaluated))
      .length === 0 &&
    paramsPair[1].filter((param) => isEmptyObjectOrNull(param.evaluated))
      .length === 0
  ) {
    return paramsPair as [Parameter[], Parameter[]];
  }

  const pairPromise = paramsPair.map(async (p, i) => {
    return await evaluateRawParams(p, schema, EVAL_FUNC[i]);
  });
  return (await Promise.all(pairPromise)) as [Parameter[], Parameter[]];
};

export const evaluateParamPair = async (
  paramPair: [Parameter, Parameter],
  schema: string
) => {
  const pairPromise = paramPair.map(async (p, i) => {
    return await evaluateRawParams([p], schema, EVAL_FUNC[i]);
  });

  const resolved = await Promise.all(pairPromise);
  return [resolved[0][0], resolved[1][0]];
};
