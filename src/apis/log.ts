import { requestAsync } from ".";


enum Action {
  Debug = "debug",
  Error = "error",
  Info = "info",
  Trace = "trace",
  Warn = "warn",
}

class Log {
  sendRequest = async (action: Action, message: any) => {
    const payload: any = {
      target: "UI",
      message,
    };

    try {
      await requestAsync("log", action, payload);
    } catch (e) {
      console.log("send log failed: ", e);
    }
  };

  debug = (message: any) => {
    this.sendRequest(Action.Debug, message);
  };

  error = (message: any) => {
    this.sendRequest(Action.Error, message);
  };

  info = (message: any) => {
    this.sendRequest(Action.Info, message);
  };

  trace = (message: any) => {
    this.sendRequest(Action.Trace, message);
  };

  warn = (message: any) => {
    this.sendRequest(Action.Warn, message);
  };
}

export default new Log();
