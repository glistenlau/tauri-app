import {requestAsync} from ".";

enum Action {
  ExecuteStatement = "ExecuteStatement",
}

interface Payload {
  statement: string,
  parameters: string[],
}

class Postgres {
  sendRequest = async (action: Action, payload?: Payload) => {
    const args: any = {
      action,
    };

    if (payload) {
      args.payload = payload;
    }

    return await requestAsync("postgres", action, payload);
  }

  execute = async (statement: string, parameters: string[]) => {
    const payload = {
      statement,
      parameters,
    }

    return await this.sendRequest(Action.ExecuteStatement, payload);
  }
}

export default new Postgres();