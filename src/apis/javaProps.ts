import { requestAsync } from ".";

enum Action {
  SEARCH = "search",
}

interface PropsMap {
  [filePath: string]: {
    [propKey: string]: [string|null, string|null],
  }
}


class FileSystem {
  sendRequest = async (action: Action, filepath: string, classname: string) => {
    const payload: any = {
      filepath,
      classname,
    };

    const rsp = await requestAsync("javaProps", action, payload);
    if (rsp.success) {
      return rsp.result;
    }
  };

  search = async (filePath: string, className: string): Promise<PropsMap> => {
    return await this.sendRequest(Action.SEARCH, filePath, className);
  };
}

export default new FileSystem();
