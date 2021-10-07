import { invoke } from "@tauri-apps/api/tauri";
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
    handler: {
      name: handlerName,
      action,
      payload,
    },
  };

  const res = JSON.parse(await invoke("invoke_handler", args));

  return res;
};
