import DatabaseConsole from "./databaseConsole";

import util from "util";
import EventEmitter from "events";

class OracleClient extends EventEmitter {
  setConfig = (config: any) => {};

  alterCurrentSchema = async (conn: any, schema: string) => {};

  getPoolStatus = () => {};

  connectDatabase = async () => {};

  getConnection = async (schema: any) => {};

  closeConnection = async (conn: any) => {};

  closePool = async () => {};

  execute = async (
    statement: string,
    parameters: any,
    conn: any,
    option?: any
  ): Promise<any> => {};

  query = async (statement: string, parameters: Array<any>) => {};
}

const instance = new OracleClient();

export default instance;
