import winston, { createLogger, format, Logger } from "winston";
import Transport from "winston-transport";
import { getClient } from "../apis/graphql";
import {
  Level,
  LogMessageDocument,
  LogMessageMutation,
  LogMessageMutationVariables,
} from "../generated/graphql";

declare global {
  interface Window {
    logger: Logger;
  }
}

class CustomTransport extends Transport {
  log(info: any, callback: any) {
    setImmediate(() => {
      this.emit("logged", info);
    });
    let level;

    switch (info.level) {
      case "info":
        level = Level.Info;
        break;
      case "error":
        level = Level.Error;
        break;
      case "warn":
        level = Level.Warn;
        break;
      default:
        level = Level.Debug;
        break;
    }

    let client = getClient(8888);

    client
      .mutate<LogMessageMutation, LogMessageMutationVariables>({
        variables: { target: "UI", level, message: info.message },
        mutation: LogMessageDocument,
      })
      .finally(callback);
  }
}

const { combine, timestamp, printf } = format;

const myFormat = printf(({ label, level, message, timestamp }: any) => {
  return `[${timestamp}] [${level}] : ${message}`;
});

export const initLogger = () => {
  const printFormat = combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.splat(),
    format.json(),
    format.simple(),
    myFormat
  );

  const logger = createLogger({
    transports: [
      new CustomTransport({
        format: combine(format.splat(), format.json()),
        level: "info",
      }),
      new winston.transports.Console({
        format: printFormat,
        handleExceptions: true,
        level: "debug",
      }),
    ],
  });

  window.logger = logger;
};
