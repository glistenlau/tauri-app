import {promisified} from "tauri/api/tauri";

enum Action {
  ExecuteStatement = "ExecuteStatement",
}

interface Payload {
  statement: string,
  parameters: string[],
}

class Oracle {
  sendRequest = async (action: Action, payload?: Payload) => {
    const args: any = {
      cmd: 'executeOracle',
      action,
    };

    if (payload) {
      args.payload = payload;
    }

    return await promisified(args);
  }

  execute = async (statement: string, parameters: string[]) => {
    const payload = {
      statement,
      parameters,
    }

    return await this.sendRequest(Action.ExecuteStatement, payload);
  }
}

export default new Oracle();