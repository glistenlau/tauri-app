import {promisified} from "tauri/api/tauri";
import { RSA_NO_PADDING } from "constants";

export const requestAsync = async (handlerName: string, action: any, payload: any) => {
  const args = {
    cmd: 'asyncCommand',
    handler: {
      name: handlerName,
      action,
      payload,
    }
  }

  window.logger.debug("send request: %o", args);

  const res = JSON.parse(await promisified(args));

  window.logger.debug("Got response: %o", res);
  return res;
}