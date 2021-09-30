import EventEmitter from "events";
import { TransactionMode } from "../features/transactionControl/transactionControlSlice";
import OraClient from "./oracle";
import PgClient from "./postgres";

export enum EVENTS {
  POSTGRES_DISCONNECT = "POSTGRES_DISCONNECT",
}

export enum DB_TYPE {
  ORACLE = 0,
  POSTGRES = 1,
}

enum CONN_STATUS {
  RUNNING = "running",
  PENDING = "pending",
  IDLE = "idle",
}

const WAIT_TIMEOUT = 600000; // 10 mins wait timeout

class DatabaseConsole extends EventEmitter {
  oracleConnection: any = null;
  postgresConnection: any = null;
  transactionMode: TransactionMode = TransactionMode.Manual;
  currentSchema: string = "";
  connectionStatusPair: [CONN_STATUS, CONN_STATUS] = [
    CONN_STATUS.IDLE,
    CONN_STATUS.IDLE,
  ];
  waitingListPair: [Array<any>, Array<any>] = [[], []];

  constructor() {
    super();
  }

  setSchema = async (schema: string) => {
    this.currentSchema = schema;

    if (this.oracleConnection) {
      await OraClient.alterCurrentSchema(this.oracleConnection, schema);
    }
    if (this.postgresConnection) {
      await PgClient.setSearchPath(
        this.postgresConnection,
        ["anaconda", schema].join(",")
      );
    }
  };

  setTransactionMode = async (transactionMode: TransactionMode) => {
    if (transactionMode === this.transactionMode) {
      return;
    }

    this.transactionMode = transactionMode;

    if (transactionMode === TransactionMode.Auto) {
      await this.commit();
      await this.closeOracleConnection();
      await this.closePostgresConnection();
    }
  };

  commitOracle = async () => {
    if (
      this.transactionMode === TransactionMode.Manual &&
      this.oracleConnection
    ) {
      try {
        await this.oracleConnection.commit();
      } catch (e) {
        return false;
      } finally {
        await this.closeOracleConnection();
      }
    }
    return true;
  };

  commitPostgres = async () => {
    if (
      this.transactionMode === TransactionMode.Manual &&
      this.postgresConnection
    ) {
      try {
        await PgClient.commit(this.postgresConnection);
      } catch (e) {
        return false;
      } finally {
        await this.closePostgresConnection();
      }
    }
    return true;
  };

  commit = async () => {
    const [oracleSuccess, postgresSuccess] = await Promise.all([
      this.commitOracle(),
      this.commitPostgres(),
    ]);

    let msg = "";
    if (!oracleSuccess) {
      msg += "Commit oralce connection failed.";
    }
    if (!postgresSuccess) {
      msg += "Commit postgres connectin failed.";
    }

    if (msg.length > 0) {
      throw new Error(msg);
    }
  };

  rollbakOracle = async () => {
    if (
      this.transactionMode === TransactionMode.Manual &&
      this.oracleConnection
    ) {
      try {
        await this.oracleConnection.rollback();
      } catch (e) {
        return false;
      } finally {
        await this.closeOracleConnection();
      }
    }
    return true;
  };

  rollbackPostgres = async () => {
    if (
      this.transactionMode === TransactionMode.Manual &&
      this.postgresConnection
    ) {
      try {
        await PgClient.rollback(this.postgresConnection);
      } catch (e) {
        return false;
      } finally {
        await this.closePostgresConnection();
      }
    }
    return true;
  };

  rollback = async () => {
    const [oracleSuccess, postgresSuccess] = await Promise.all([
      this.rollbakOracle(),
      this.rollbackPostgres(),
    ]);

    let msg = "";
    if (!oracleSuccess) {
      msg += "Rollback oralce connection failed.";
    }
    if (!postgresSuccess) {
      msg += "Rollback postgres connectin failed.";
    }

    if (msg.length > 0) {
      throw new Error(msg);
    }
  };

  closeOracleConnection = async () => {
    if (!this.oracleConnection) {
      return;
    }

    try {
      await OraClient.closeConnection(this.oracleConnection);
    } catch (e) {
    } finally {
      this.oracleConnection = null;
    }
  };

  closePostgresConnection = async () => {
    if (!this.postgresConnection) {
      return;
    }

    try {
      await PgClient.closeConnection(this.postgresConnection);
    } catch (e) {
    } finally {
      this.postgresConnection = null;
    }
  };

  releaseConnHold = (index: DB_TYPE) => {
    const waitingList = this.waitingListPair[index];
    if (waitingList.length > 0 && this.checkConnAvailable(index)) {
      const [resolve, reject, timeoutId] = waitingList.shift();
      clearTimeout(timeoutId);
      resolve(true);
    }
  };

  executeOralce = async (
    statement: string,
    parameter: any,
    schema = this.currentSchema
  ) => {
    const curTx = this.transactionMode;
    const conn = await this.getOracleConn(schema);
    try {
      if (curTx === TransactionMode.Manual) {
        this.connectionStatusPair[DB_TYPE.ORACLE] = CONN_STATUS.RUNNING;
      }

      const options: any = {};
      if (curTx === TransactionMode.Auto) {
        options.autoCommit = true;
      }

      const ret = await OraClient.execute(statement, parameter, conn, options);
      return ret;
    } finally {
      if (curTx === TransactionMode.Auto) {
        await OraClient.closeConnection(conn);
      } else {
        this.connectionStatusPair[DB_TYPE.ORACLE] = CONN_STATUS.IDLE;
      }
    }
  };

  executePostgres = async (
    statement: string,
    parameter: any,
    schema = this.currentSchema
  ) => {
    const curTx = this.transactionMode;
    const conn = await this.getPostgresConn(schema);
    try {
      if (curTx === TransactionMode.Manual) {
        this.connectionStatusPair[DB_TYPE.POSTGRES] = CONN_STATUS.RUNNING;
      }

      const ret = await PgClient.execute(statement, parameter, conn);
      return ret;
    } finally {
      if (curTx === TransactionMode.Auto) {
        await PgClient.closeConnection(conn);
      } else {
        this.connectionStatusPair[DB_TYPE.POSTGRES] = CONN_STATUS.IDLE;
      }
    }
  };

  checkConnAvailable = (index: DB_TYPE) => {
    const poolStatus =
      index === 0 ? OraClient.getPoolStatus() : PgClient.getPoolStatus();
    if (this.transactionMode === TransactionMode.Auto) {
      if (poolStatus === null) {
        return true;
      }
    } else {
      if (this.connectionStatusPair[index] === CONN_STATUS.IDLE) {
        return true;
      }
    }

    return false;
  };

  waitConnAvailable = (index: DB_TYPE) => {
    if (this.checkConnAvailable(index)) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const entry: any = [resolve, reject];
      this.waitingListPair[index].push(entry);
      const timeoutId = setTimeout(() => {
        const pos = this.waitingListPair[index].findIndex(entry);
        if (pos >= 0) {
          this.waitingListPair[index].splice(pos, 1);

          if (this.checkConnAvailable(index)) {
            resolve(true);
          } else {
            reject(new Error("Wait conn timeout."));
          }
        }
      }, WAIT_TIMEOUT);
      entry.push(timeoutId);
    });
  };

  getOracleConn = async (schema = this.currentSchema) => {
    await this.waitConnAvailable(DB_TYPE.ORACLE);
    if (this.transactionMode === TransactionMode.Auto) {
      return await this.connectOracle(schema);
    }

    this.connectionStatusPair[DB_TYPE.ORACLE] = CONN_STATUS.PENDING;
    if (!this.oracleConnection) {
      this.oracleConnection = await this.connectOracle(schema);
    }
    return this.oracleConnection;
  };

  getPostgresConn = async (schema = this.currentSchema) => {
    await this.waitConnAvailable(DB_TYPE.POSTGRES);
    if (this.transactionMode === TransactionMode.Auto) {
      return await this.connectPostgres(schema);
    }
    this.connectionStatusPair[DB_TYPE.POSTGRES] = CONN_STATUS.PENDING;
    if (!this.postgresConnection) {
      this.postgresConnection = await this.connectPostgres(schema);
    }
    return this.postgresConnection;
  };

  connectOracle = async (schema = this.currentSchema) => {
    return await OraClient.getConnection(schema);
  };

  connectPostgres = async (schema = this.currentSchema) => {
    const conn = await PgClient.getConnection(
      this.transactionMode !== TransactionMode.Auto,
      ["anaconda", schema].join(",")
    );

    return conn;
  };
}

export default new DatabaseConsole();
