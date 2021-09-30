import { requestAsync } from ".";

enum Action {
  FormatSql = "formatSql",
}

interface Response {
  result: string[];
}

interface Payload {
  snippets: string[];
}

class Formatter {
  sendRequest = async (action: Action, payload: Payload): Promise<string[]> => {
    const rsp = (await requestAsync("formatter", action, payload)) as Response;
    return rsp.result;
  };

  formatSql = async (snippets: string[]) => {
    const payload = {
      snippets,
    };

    return await this.sendRequest(Action.FormatSql, payload);
  };
}

export default new Formatter();
