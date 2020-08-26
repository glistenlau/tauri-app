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

  const res = JSON.parse(await promisified(args));

  console.log("got cmd response", res);

  return res;
}