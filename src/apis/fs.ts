import { requestAsync } from ".";

enum Action {
  APPEND = "append",
}

class FileSystem {
  sendRequest = async (action: Action, path: string, value?: string) => {
    const payload: any = {
      path,
    };

    if (value) {
      payload.val = value;
    }

    const rsp = await requestAsync("file", action, payload);
    if (rsp.success) {
      return rsp;
    }
  };

  append = async (path: string, value: string) => {
    return await this.sendRequest(Action.APPEND, path, value);
  };
}

export default new FileSystem();
