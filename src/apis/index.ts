import {promisified} from "tauri/api/tauri";

export const requestAsync = async (handlerName: string, action: any, payload: any) => {
  const args = {
    cmd: 'asyncCommand',
    handler: {
      name: handlerName,
      action,
      payload,
    }
  }

  return await promisified(args);
}