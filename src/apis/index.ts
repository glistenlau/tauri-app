import { promisified } from "tauri/api/tauri";

interface Elapsed {
  secs: number;
  nanos: number;
}

export type Response<T> =
  | {
      success: false;
      elapsed: Elapsed;
      result: { message: string };
    }
  | { success: true; elapsed: Elapsed; result: T };

export const requestAsync = async (
  handlerName: string,
  action: any,
  payload: any
) => {
  const args = {
    cmd: "asyncCommand",
    handler: {
      name: handlerName,
      action,
      payload
    }
  };

  const res = JSON.parse(await promisified(args));

  console.log('request async result: ', res);

  return res;
};
