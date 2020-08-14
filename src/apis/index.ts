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

  console.log("send request: ", args);

  const res = JSON.parse(await promisified(args));
  console.log("Got response: ", res);
  return res;
}