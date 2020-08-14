import winston, { createLogger, format, Logger } from "winston";
import Transport from "winston-transport";
import LogApi from "../apis/log";

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
    let handler;

    switch (info.level) {
      case "info":
        handler = LogApi.info;
        break;
      case "error":
        handler = LogApi.error;
        break;
      case "warn":
        handler = LogApi.warn;
        break;
      default:
        break;
    }

    if (handler) {
      handler(info.message);
    }

    callback();
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
