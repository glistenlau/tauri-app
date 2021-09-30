import { requestAsync } from ".";
import { SQLError } from "./sqlCommon";

enum Action {
  SEARCH = "search",
  SAVE_PROP = "saveProp",
}

export interface FilePropsMap {
  [filePath: string]: {
    [propKey: string]: [string, string];
  };
}

export interface ValidateResult {
  status: "pass" | "warn" | "error";
  error?: SQLError;
}

export interface PropsValidMap {
  [propKey: string]: ValidateResult;
}

export interface FilePropsValidMap {
  [filePath: string]: PropsValidMap;
}

export interface JavaPropsResponse {
  file_props_map: FilePropsMap;
  file_props_valid_map: FilePropsValidMap;
}

class JavaProps {
  sendRequest = async (action: Action, payload: any) => {
    const rsp = await requestAsync("javaProps", action, payload);
    if (rsp.success) {
      return rsp.result;
    }
  };

  search = async (
    filePath: string,
    className: string
  ): Promise<JavaPropsResponse> => {
    const payload: any = {
      filepath: filePath,
      classname: className,
    };

    return await this.sendRequest(Action.SEARCH, payload);
  };

  saveProp = async (filepath: string, propKey: string, propValue: string) => {
    const payload: any = {
      filepath,
      propKey,
      propValue,
    };

    return await this.sendRequest(Action.SAVE_PROP, payload);
  };
}

export default new JavaProps();
