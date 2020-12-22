import {
  amber,
  blue,
  brown,
  cyan,
  deepPurple,
  green,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal
} from "@material-ui/core/colors";
import crypto from "crypto";
import glob from "glob";
import { SQLError } from "../apis/sqlCommon";
import { TimeElapsed } from "../reducers/queryRunner";

export const getLogPath = () => {};

export const getDBPath = () => {};

const NS_PER_S = 1e9;
export const isSpace = (c: string) => {
  return c === " " || c === "\t" || c === "\n" || c === "\f" || c === "\r";
};

export const getObjFirstKey = (obj: Object) => {
  if (!obj) {
    return null;
  }
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return null;
  }

  return keys[0];
};

export const getOraclePathFromClassPath = (classPath: string) => {
  return `${classPath}.oracle.properties`;
};

export const getPostgresPathFromClassPath = (classPath: string) => {
  return `${classPath}.pg.properties`;
};

export const getParameterMarkerPosition = (statement: string) => {
  let row = 1;
  let col = 1;

  const positions = [];

  for (let i = 0; i < statement.length; i++) {
    const ch = statement[i];
    if (ch === "?") {
      positions.push({ row, col });
    }
    if (ch === "\n") {
      row++;
      col = 1;
    } else {
      col++;
    }
  }

  return positions;
};

export const getRange = (
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) => ({
  startRow,
  startCol,
  endRow,
  endCol,
});

export const updateArrayElement = <T>(
  arr: Array<T>,
  index: number,
  updated: any
): Array<T> => {
  return [...arr.slice(0, index), updated, ...arr.slice(index + 1)];
};

export const getEffectiveStatements = (statements: Array<string>) => {
  const oraStatement = statements[0];
  const pgStatement =
    statements[1].trim().length > 0 ? statements[1] : oraStatement;

  return [oraStatement, pgStatement];
};

export const getParameterCount = (statements: Array<string>) => {
  return statements.map((s) => s.match(/\?/g)?.length);
};

let canvas: any;
export const getTextWidth = (text: string, font: string): number => {
  // re-use canvas object for better performance
  canvas = canvas || document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = font;
  var metrics = context.measureText(text);
  return Math.ceil(metrics.width);
};

export const addTimeElapsed = (
  e1: TimeElapsed,
  e2: TimeElapsed
): TimeElapsed => {
  const nano = e1[1] + e2[1];
  const second = e1[0] + e2[0] + Math.floor(nano / NS_PER_S);
  return [second, nano % NS_PER_S];
};

export const globFile = (
  searchPath: string,
  target: string
): Promise<string[]> => {
  const searchPatern = `${searchPath}/${target}`;

  return new Promise((resolve, reject) => {
    glob(searchPatern, { nocase: true }, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

const colors = [
  red,
  pink,
  purple,
  green,
  deepPurple,
  indigo,
  blue,
  lightBlue,
  cyan,
  teal,
  lightGreen,
  lime,
  amber,
  orange,
  brown,
];

export const getHashColor = (str: string) => {
  const shasum = crypto.createHash("sha1");
  shasum.update(str);
  const key = shasum.digest("hex");
  const intKey = parseInt(key.substring(key.length - 6), 16);

  return colors[intKey % colors.length];
};

export const findRangeIgnoreSpace = (
  source: string,
  target: string,
  start?: number,
  end?: number
) => {
  if (!source || !target) {
    return null;
  }
  const srcEnd = end ? end : source.length;

  for (let i = start ? start : 0; i < srcEnd; i++) {
    if (source[i] !== target[0]) {
      continue;
    }
    let si = i + 1;
    let ti = 1;

    while (si < srcEnd && ti < target.length) {
      const sc = source.charAt(si);
      const tc = target.charAt(ti);
      if (isSpace(sc)) {
        si++;
        continue;
      }
      if (isSpace(tc)) {
        ti++;
        continue;
      }

      if (sc !== tc) {
        break;
      }

      ti++;
      si++;
    }

    if (ti === target.length) {
      return [i, si];
    }
  }

  return null;
};

const numberToString = (number: number, length: number) => {
  if (!number) {
    return "0".repeat(length);
  }
  const numStr = number.toString();
  if (numStr.length < length) {
    return "0".repeat(length - numStr.length) + numStr;
  }
  if (numStr.length > length) {
    return numStr.substr(0, length);
  }

  return numStr;
};

export const postgresIntevalToString = (pi: any) => {
  if (!pi) {
    return "";
  }

  let ret = [];
  if (pi.years) {
    const affix = pi.year > 1 ? "years" : "year";
    ret.push(`${pi.year} ${affix}`);
  }
  if (pi.months) {
    const affix = pi.months > 1 ? "months" : "month";
    ret.push(`${pi.months} ${affix}`);
  }
  if (pi.days) {
    const affix = pi.days > 1 ? "days" : "day";
    ret.push(`${pi.days} ${affix}`);
  }

  ret.push(
    `${numberToString(pi.hours, 2) || "00"}:${
      numberToString(pi.minutes, 2) || "00"
    }:${numberToString(pi.seconds, 2) || "00"}.${
      numberToString(pi.milliseconds * 1000, 6) || "000000"
    }`
  );
  return ret.join(" ");
};

export const stringifySqlError = (sqlError: SQLError) => {
  const errorParts = [];
  for (const [key, value] of Object.entries(sqlError)) {
    if (value == null) {
      continue;
    }

    const value_str =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    errorParts.push(`${key}: ${value_str}`);
  }
  return errorParts.join("\r\n\r\n");
};

export const isEmptyObjectOrNull = (obj?: object): boolean => {
  if (!obj) {
    return true;
  }
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};
