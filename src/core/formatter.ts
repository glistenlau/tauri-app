import SqlFormatter from "sql-formatter";

export const format = (text: string) => {
  let formated = SqlFormatter.format(text, {
    language: "pl/sql",
  });

  return correct(text, formated);
};

const isSpace = (c: string) => {
  return c === " " || c === "\t" || c === "\n" || c === "\f" || c === "\r";
};

const isSingleQoute = (c: string) => {
  return c === "'";
};

const correct = (ori: string, formatted: string) => {
  let oi = 0;
  let fi = 0;
  let corrected = "";

  while (oi < ori.length || fi < formatted.length) {
    if (oi < ori.length && isSpace(ori[oi])) {
      oi++;
      continue;
    }
    if (oi >= ori.length) {
      corrected += formatted.substring(fi);
      break;
    }

    if (ori[oi] !== formatted[fi]) {
      if ((oi === 0 || isSpace(ori[oi - 1])) && isSpace(formatted[fi])) {
        corrected += formatted[fi++];
      } else if (isSpace(formatted[fi])) {
        // Unexpected space in formatted string, ignore.
        fi++;
      } else {
        // Character mismatch, something is wrong, just return the original text.
        return ori;
      }
    } else if (isSingleQoute(ori[oi])) {
      // Found string literal, just copy it from the original text.
      const noi = findCloseQouteIndex(ori, oi + 1);
      fi = findCloseQouteIndex(formatted, fi + 1);

      // Single qoute not close correctly, just add the remaining original text.
      if (noi === -1 || fi === -1) {
        corrected += ori.substring(oi);
        break;
      }
      corrected += ori.substring(oi, noi);
      oi = noi;
    } else if (isSingleLineComment(ori, oi)) {
      // found a single comment
      const noi = ori.indexOf("\n", oi);
      const nfi = formatted.indexOf("\n", fi);
      if (nfi !== -1) {
        corrected += formatted.substring(fi, nfi + 1);
        fi = nfi + 1;
      } else {
        corrected += formatted.substring(fi);
        fi += 2;
      }
      oi = noi === -1 ? 2 : noi + 1;
    } else if (isMultipleLineComment(ori, oi)) {
      // found multiline comment
      const noi = findMultipleLineCommentClose(ori, oi);
      if (noi === -1) {
        corrected += ori.substring(oi);
        break;
      }
      const nfi = findMultipleLineCommentClose(formatted, oi);
      oi = noi;
      fi = nfi === -1 ? fi : nfi;
    } else {
      corrected += ori[oi];
      oi++;
      fi++;
    }
  }

  return corrected;
};

const findCloseQouteIndex = (text: string, start: number) => {
  let index = start;
  while (index < text.length) {
    index = text.indexOf("'", index);
    if (index + 1 < text.length && isSingleQoute(text[index + 1])) {
      index = index + 2;
      continue;
    }
    return index + 1;
  }
  return -1;
};

const isSingleLineComment = (text: string, start: number) => {
  return start + 1 < text.length && text.substring(start, start + 2) === "--";
};

const isMultipleLineComment = (text: string, start: number) => {
  return start + 1 < text.length && text.substring(start, start + 2) === "/*";
};

const findMultipleLineCommentClose = (text: string, start: number) => {
  let startComment = 0;
  let index = start;
  while (index < text.length) {
    if (index + 1 < text.length && text.substr(index, 2) === "/*") {
      index += 2;
      startComment++;
    }
    if (index + 1 < text.length && text.substr(index, 2) === "*/") {
      index += 2;
      startComment--;
      if (startComment === 0) {
        return index;
      }
    }
    index++;
  }
  return -1;
};
