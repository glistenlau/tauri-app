import {requestAsync} from ".";

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
      action,
    };

    if (payload) {
      args.payload = payload;
    }

    return await requestAsync("oracle", action, payload);
  }

  execute = async (statement: string, parameters: any[]) => {
    const payload = {
      statement,
      parameters,
    }

    return await this.sendRequest(Action.ExecuteStatement, payload);
  }
}

export default new Oracle();