import { getHashColor, isSpace } from "../util";

export class XmlTag {
  id: string;
  defaultOpen: boolean;
  tagName: string;
  attr: any;
  children: XmlTag[];
  start: number;
  end: number;
  match: boolean;
  tagColor: string;

  static clone = (tag: XmlTag) => {
    if (!tag) {
      return null;
    }

    const cloneTag = new XmlTag(tag.tagName);
    cloneTag.attr = Object.assign({}, tag.attr);
    cloneTag.defaultOpen = tag.defaultOpen;
    cloneTag.end = tag.end;
    cloneTag.start = tag.start;
    cloneTag.id = tag.id;
    cloneTag.match = tag.match;
    cloneTag.tagColor = tag.tagColor;
    cloneTag.children = [...tag.children];

    return cloneTag;
  };

  static extractAttr(tag: XmlTag, attrKey: string) {
    if (tag.attr[attrKey]) {
      return tag.attr[attrKey];
    }

    return "";
  }

  constructor(tagName: string) {
    this.id = "";
    this.tagName = tagName;
    this.attr = {};
    this.start = -1;
    this.end = -1;
    this.children = [];
    this.defaultOpen = false;
    this.match = false;
    this.tagColor = getHashColor(tagName)[800];
  }

  setStart(start: number) {
    this.start = start;
  }

  setEnd(end: number) {
    this.end = end;
  }

  setId(id: string) {
    this.id = id;
  }

  appendAttr(attrName: string, attrVal: string) {
    this.attr[attrName] = attrVal;
  }

  appendChildren(childXmlTag: XmlTag) {
    this.children.push(childXmlTag);
  }

  getFamilyAttr() {
    const family = this.attr.family;
    return family ? family : "";
  }

  toString() {
    const tag = `${this.tagName}`;
    const name = this.attr.name;
    return name ? `${tag}-${name}` : tag;
  }
}

const OPEN_COMMENT = "<!--";
const CLOSE_COMMENT = "-->";
const OPEN_CDATA = "<![CDATA[";
const CLOSE_CDATA = "]]>";
const OPEN_DOCTYPE = "<!DOCTYPE";
const CLOSE_DOCTYPE = "]>";
const OPEN_XML_PROLOG = "<?xml";
const CLOSE_XML_PROLOG = "?>";

const COMMENT_TAG_PATERN = [OPEN_COMMENT, CLOSE_COMMENT, "Comment"];

const SPECIAL_TAGS = [
  [OPEN_CDATA, CLOSE_CDATA, "CDATA"],
  [OPEN_DOCTYPE, CLOSE_DOCTYPE, "DOCTYPE"],
  [OPEN_XML_PROLOG, CLOSE_XML_PROLOG, "XMLProlog"],
];

const processTagPatern = (
  text: string,
  index: number,
  patern: Array<string>
) => {
  const [openTag, closeTag, tagName] = patern;
  if (
    index + openTag.length > text.length ||
    text.substr(index, openTag.length) !== openTag
  ) {
    return -1;
  }
  const closeIndex = text.indexOf(closeTag, index + openTag.length);
  if (closeIndex === -1) {
    throw new Error(`Unclosed ${tagName} tag.`);
  }

  return closeIndex + closeTag.length - 1;
};

const processCommentTag = (text: string, index: number) => {
  return processTagPatern(text, index, COMMENT_TAG_PATERN);
};

const processSpecialTags = (text: string, index: number) => {
  for (let specialTagPair of SPECIAL_TAGS) {
    const closeIndex = processTagPatern(text, index, specialTagPair);
    if (closeIndex !== -1) {
      return closeIndex;
    }
  }

  return -1;
};

enum TagType {
  START = "START",
  END = "END",
  EMPTY = "EMPTY",
}

const processTag = (
  text: string,
  index: number,
  tagStartIndex: number,
  startOffset: number = 0
) => {
  if (index + 2 < text.length && text.substr(index, 2) === "</") {
    index += 2;
    const endIndex = text.indexOf(">", index);
    if (endIndex === -1) {
      throw new Error("invalid xml format: unclosed tag");
    }
    const tagName = text.substring(index, endIndex).trim();
    return {
      type: TagType.END,
      endIndex: endIndex,
      tagName,
    };
  }

  let start = index + 1;
  while (
    start < text.length &&
    !isSpace(text[start]) &&
    text[start] !== ">" &&
    text[start] !== "/"
  ) {
    start++;
  }
  if (start === text.length) {
    throw new Error("Invalid format");
  }

  const tagName = text.substring(index + 1, start);
  const xmlTag = new XmlTag(tagName);
  if (tagStartIndex !== -1) {
    xmlTag.setStart(startOffset + tagStartIndex);
  } else {
    xmlTag.setStart(startOffset + index);
  }

  for (let end = start; end < text.length; end++) {
    const curChar = text[end];
    if (curChar === "/" && end + 1 < text.length && text[end + 1] === ">") {
      xmlTag.setEnd(startOffset + end + 1);
      return {
        type: TagType.EMPTY,
        endIndex: end + 1,
        tag: xmlTag,
      };
    }
    if (curChar === ">") {
      return {
        type: TagType.START,
        endIndex: end,
        tag: xmlTag,
      };
    }

    if (curChar === "=") {
      let attrName = text.substring(start, end).trim();
      let attrVal = "";
      let openQoute = "";
      let openQouteIndex = -1;
      for (let ai = end + 1; ai < text.length; ai++) {
        const attrChar = text[ai];
        if (!openQoute && (attrChar === '"' || attrChar === "'")) {
          openQoute = attrChar;
          openQouteIndex = ai;
          continue;
        }
        if (openQoute.length > 0 && attrChar === openQoute) {
          attrVal = text.substring(openQouteIndex + 1, ai);
          start = ai + 1;
          end = ai;
          break;
        }
      }

      xmlTag.appendAttr(attrName, attrVal);
    }
  }
};

export const parseXML = (text: string, startOffset = 0) => {
  const rootXml = new XmlTag("root");
  const tagStack: XmlTag[] = [rootXml];
  let nextTagStartIndex = -1;

  rootXml.setStart(startOffset);
  rootXml.setEnd(startOffset + text.length - 1);

  for (let i = 0; i < text.length; i++) {
    const curChar = text[i];
    if (curChar === "<") {
      const endIndex = processSpecialTags(text, i);
      if (endIndex !== -1) {
        i = endIndex;
        continue;
      }
      const commentEndIndex = processCommentTag(text, i);
      if (commentEndIndex !== -1) {
        if (nextTagStartIndex === -1) {
          nextTagStartIndex = i;
        }
        i = commentEndIndex;
        continue;
      }

      const tagInfo = processTag(text, i, nextTagStartIndex, startOffset);
      nextTagStartIndex = -1;
      i = tagInfo.endIndex;

      if (tagInfo.type === TagType.EMPTY) {
        tagStack[tagStack.length - 1].appendChildren(tagInfo.tag);
      } else if (tagInfo.type === TagType.END) {
        const xmlTag = tagStack.pop();
        xmlTag.setEnd(startOffset + tagInfo.endIndex);

        if (xmlTag.tagName !== tagInfo.tagName) {
          throw new Error(
            `invalid xml format: mismatch tag name, the open tag is ${xmlTag.tagName}, the close tag is ${tagInfo.tagName}`
          );
        }
      } else if (tagInfo.type === TagType.START) {
        if (tagStack.length !== 0) {
          tagStack[tagStack.length - 1].appendChildren(tagInfo.tag);
          tagStack.push(tagInfo.tag);
        }
      }
    }
  }

  if (tagStack.length !== 1) {
    throw new Error("Found unclosed tag.");
  }

  return rootXml;
};
