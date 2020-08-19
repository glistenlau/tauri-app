import { requestAsync } from ".";

enum Action {
  SEARCH = "search",
}

export interface FilePropsMap {
  [filePath: string]: {
    [propKey: string]: [string | null, string | null];
  };
}

export interface PropsValidMap {
  [propKey: string]: {
    status: "pass" | "warn" | "error",
    detail?: string,
  }
}

export interface FilePropsValidMap {
  [filePath: string]: PropsValidMap
}

export interface JavaPropsResponse {
  file_props_map: FilePropsMap,
  file_props_valid_map: FilePropsValidMap,
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

  search = async (filePath: string, className: string): Promise<JavaPropsResponse> => {
    return await this.sendRequest(Action.SEARCH, filePath, className);
  };
}

export default new FileSystem();
