import fs, { promises as fsPromises } from "fs";

export default class JavaProperties {
  curKey: string;
  curVal: string;
  filePath: string;
  result: { [key: string]: string };

  constructor(filePath: string) {
    this.filePath = filePath;
    this.curKey = "";
    this.curVal = "";
    this.result = {};
  }

  escapeKey = (key: string) => {
    let escaped = key.replace(/ /g, "\\ ");
    escaped = escaped.replace(/=/g, "\\=");
    escaped = escaped.replace(/:/g, "\\:");

    return escaped;
  };

  unescapeKey = (key: string) => {
    let unescaped = key.replace(/\\ /g, " ");
    unescaped = unescaped.replace(/\\=/g, "=");
    unescaped = unescaped.replace(/\\:/g, ":");

    return unescaped;
  };

  escapeValue = (value: string) => {
    let escaped = value.replace(/\r/g, "\\r");
    escaped = escaped.replace(/\n/g, "\\n");
    escaped = escaped.replace(/\\/g, "\\\\");

    return escaped;
  };

  unescapeValue = (value: string) => {
    let unescaped = value.replace(/\\r/g, "\r");
    unescaped = unescaped.replace(/\\n/g, "\n");
    unescaped = unescaped.replace(/\\\\/g, "\\");

    return unescaped;
  };

  read = async () => {
    await this.processLineByLine();

    return this.result;
  };

  writeProp = async (propKey: string, propValue: string) => {
    const lines = [];
    let proccessed = false;

    if (fs.existsSync(this.filePath)) {
      const rl: any = null;
      let prevKey = "";

      for await (const line of rl) {
        const processingKey = this.processLine(line);

        if (processingKey !== prevKey) {
          if (prevKey === propKey) {
            proccessed = true;
            this.pushWritePropLines(lines, propKey, propValue, false);
          }
          prevKey = processingKey;
        }

        if (processingKey === propKey) {
          continue;
        }

        lines.push(line);
      }
    }

    if (!proccessed) {
      this.pushWritePropLines(lines, propKey, propValue, true);
    }
    if (lines.length > 0 && lines[lines.length - 1].trim().length > 0) {
      lines.push("");
    }

    await fsPromises.writeFile(this.filePath, lines.join("\n"));
  };

  pushWritePropLines = (
    lines: Array<string>,
    propKey: string,
    propValue: string,
    appendNewLine?: boolean
  ) => {
    const preLine = lines.length > 0 ? lines[lines.length - 1].trim() : "";
    const prependNewLine =
      !preLine.startsWith(`${propKey}.MD5`) && preLine.length > 0;

    let propValLines = propValue.trim().split(/\n/);
    const escapedValLines = propValLines.map((l: string, index) => {
      const escapedLine = this.escapeValue(l.trimEnd());
      return escapedLine + (index === propValLines.length - 1 ? "" : " \\n\\");
    });
    if (appendNewLine) {
      escapedValLines.push("");
    }
    const keyLine = `${this.escapeKey(propKey)}=\\`;

    if (prependNewLine) {
      lines.push("");
    }

    return lines.push(keyLine, ...escapedValLines);
  };

  readLine = () => {
    this.reset();

    const fileStream = fs.createReadStream(this.filePath);
  };

  processLineByLine = async () => {
    const rl: any = null;

    for await (const line of rl) {
      this.processLine(line);
    }
    // Procss one more line to make sure the last key is saved.
    this.processLine("");
  };

  resetKeyVal = () => {
    this.curKey = "";
    this.curVal = "";
  };

  reset = () => {
    this.resetKeyVal();
    this.result = {};
  };

  processLine = (line: string) => {
    let processingKey = this.curKey;
    const trimmedLine = line.trim();
    line = line.trimEnd();
    if (trimmedLine.startsWith("#") || trimmedLine.startsWith("!")) {
      return processingKey;
    }

    let terminated = true;

    if (!this.curKey) {
      const keyPatern = /\s*((?:\\ |\\=|\\:|[^:= ])*)[ |\t|\f]*[=|:]?\s*(.*)/g;
      const match = keyPatern.exec(line);

      if (!match) {
        return processingKey;
      }

      this.curKey = this.unescapeKey(match[1]);
      processingKey = this.curKey;
      line = match[2];
    }

    let tailingBackslash = 0;
    for (let i = line.length - 1; i >= 0; i--) {
      if (line[i] !== "\\") {
        break;
      }
      tailingBackslash++;
    }

    if (tailingBackslash % 2 !== 0) {
      terminated = false;
      line = line.substring(0, line.length - 1);
    }

    line = this.unescapeValue(line);

    this.curVal += line;

    if (terminated && this.curKey) {
      this.result[this.curKey] = this.curVal;
      this.resetKeyVal();
    }

    return processingKey;
  };
}
