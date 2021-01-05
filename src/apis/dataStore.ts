import { requestAsync } from ".";

enum Action {
  GET = "get",
  PUT = "put",
  DELETE = "delete"
}

interface Response {
  success: boolean;
  value?: string;
}

class DataStore {
  sendRequest = async (
    
    action: Action,
  
     key: string,
  
     val?: string
  
  ): Promise<string | undefined> => {
    const payload: any = {
      key
    };

    if (val) {
      payload.val = val;
    }

    const rsp = (await requestAsync("rocksDB", action, payload)) as Response;
    if (rsp.success) {
      return rsp.value;
    }
  };

  getItem = async (key: string): Promise<string | undefined> => {
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
