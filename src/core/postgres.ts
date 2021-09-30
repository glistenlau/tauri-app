import DatabaseConsole from "./databaseConsole";

import { postgresIntevalToString } from "../util";
import EventEmitter from "events";

export enum ErrorClassPrefix {
  syntax_error = "42",
}

export enum ErrorCode {
  datatype_mismatch = "42804",
  syntax_error = "42601",
  undefined_table = "42P01",
}

export type PostgresResultType = {
  result: any;
  elapsed: [number, number];
};

const NEW_TRANSACTION_SETUP_QUERY = "BEGIN;";
const VALIDATE_CAST = "CREATE CAST (text AS integer) WITH INOUT AS IMPLICIT;";
export enum POSTGRES_EVENT {
  QUERY_FINISH = "postgres_query_finish",
}
class PostgresClient extends EventEmitter {
  setConfig = (config: any) => {};

  setSearchPath = async (conn: any, searchPath: string) => {};

  getPoolStatus = () => {};

  connectDatabase = async () => {};

  getConnection = async (startTransaction = true, schema: any) => {};

  rollback = async (client: any) => {};

  commit = async (client: any) => {};

  beginTrasaction = async (client: any) => {};

  closeConnection = async (client: any) => {};

  closePool = async () => {};

  execute = async (
    statement: string,
    parameters: Array<any>,
    conn: any
  ): Promise<any> => {};

  query = async (statement: string, parameters: Array<any>) => {};

  createValidateCast = async (conn: any) => {};

  validate = async (statement: string, parameters: Array<any>) => {};
}

const instance = new PostgresClient();

export default instance;
