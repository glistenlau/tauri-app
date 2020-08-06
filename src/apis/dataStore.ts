import {promisified} from "tauri/api/tauri";

enum Action {
  GET = "get",
  PUT = "put",
  DELETE = "delete",
}

class DataStore {
  sendRequest = async (action: Action, key: string, val?: string) => {
    const args: any = {
      cmd: 'executeRocksDB',
      action,
      key
    };

    if (val) {
      args.val = val;
    }

    return await promisified(args);
  }

  getItem = async (key: string) => {
    return await this.sendRequest(Action.GET, key);
  }

  setItem = async (key: string, val: string) => {
    await this.sendRequest(Action.PUT, key, val);
  }

  removeItem = async (key: string) => {
    await this.sendRequest(Action.DELETE, key);
  }
}

export default new DataStore();