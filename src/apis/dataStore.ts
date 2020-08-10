import { requestAsync } from ".";

enum Action {
  GET = "get",
  PUT = "put",
  DELETE = "delete",
}

class DataStore {
  sendRequest = async (action: Action, key: string, val?: string) => {
    const payload: any = {
      key,
    };

    if (val) {
      payload.val = val;
    }

    const rsp = await requestAsync("rocksDB", action, payload);
    if (rsp.success) {
      return rsp.value;
    }
  };

  getItem = async (key: string) => {
    return await this.sendRequest(Action.GET, key);
  };

  setItem = async (key: string, val: string) => {
    return await this.sendRequest(Action.PUT, key, val);
  };

  removeItem = async (key: string) => {
    return await this.sendRequest(Action.DELETE, key);
  };
}

export default new DataStore();
