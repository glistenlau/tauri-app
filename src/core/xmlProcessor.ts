import { promises as fsPromises } from "fs";
import { globFile } from "../util";
import { parseXML, XmlTag } from "./xmlParser";

export enum FAMILY {
  NONE = -1,
  ORACLE = 0,
  POSTGRES = 1,
}

const extractCommonPrefix = (str1: string, str2: string) => {
  const len = Math.min(str1.length, str2.length);
  let i = 0;
  for (; i < len; i++) {
    if (str1.charAt(i) !== str2.charAt(i)) {
      break;
    }
  }

  return str1.substring(0, i);
};

export interface PROCEESS_XML_RESULT {
  filePath: string;
  fileName: string;
  obj: any;
  pathValueMap: any;
  pathStatusMap: any;
  pathIndexMap: any;
  rootXmlStr: string;
}

// prettier.format(xmlText, {
//   parser: "xml",
//   printWidth: 10000,
//   plugins: [xmlP],
//   xmlWhitespaceSensitivity: "ignore"
// });

interface PathMaps {
  pathValueMap: { [key: string]: [XmlTag, XmlTag] };
  pathStatusMap: { [key: string]: [boolean, boolean] };
}

export interface XmlFile {
  rootNode: XmlTag;
  xmlData: string;
  pathValueMap: { [path: string]: [XmlTag, XmlTag] };
  pathStatusMap: { [path: string]: [boolean, boolean] };
}

class XMLProcessor {
  searchXmlTree = (xmlFiles: Array<XmlFile>, searchText: string) => {
    return xmlFiles
      .map((xmlFile) => {
        const rootNode = this.filterXmlTree(
          xmlFile.rootNode,
          searchText,
          false
        );
        if (rootNode !== null) {
          rootNode.tagColor = undefined;
          return Object.assign({}, xmlFile, { rootNode });
        }

        return null;
      })
      .filter((xmlRootTag) => xmlRootTag !== null);
  };
  filterXmlTree = (node: XmlTag, filterWord: string, parentMatch: boolean) => {
    if (!filterWord) {
      return node;
    }
    if (!node || typeof node !== "object") {
      return null;
    }

    const attrName = node.attr.name;
    const tagName = node.tagName;

    const selfMatch =
      (attrName && attrName.toLowerCase().indexOf(filterWord) !== -1) ||
      (tagName && tagName.toLowerCase().indexOf(filterWord) !== -1);

    const copyNode = new XmlTag(tagName);
    copyNode.id = node.id;
    copyNode.attr = node.attr;

    const childResults = node.children.map((child) =>
      this.filterXmlTree(child, filterWord, parentMatch || selfMatch)
    );
    const childrenMatch = childResults.some((child) => child && child.match);

    copyNode.children = childResults.filter((child) => child !== null);

    if (selfMatch || childrenMatch) {
      copyNode.match = true;
    }

    if (childrenMatch) {
      copyNode.defaultOpen = true;
    }

    if (parentMatch || selfMatch || childrenMatch) {
      return copyNode;
    }

    return null;
  };

  findAndProcessXMLFile = async (
    searchPath: string,
    fileNamePatern: string
  ): Promise<Array<XmlFile>> => {
    const trimedSearchPath = searchPath.trim();
    const trimedFileNamePatern = fileNamePatern.trim();
    const files = await globFile(trimedSearchPath, trimedFileNamePatern);
    const pathPrefix =
      trimedSearchPath.charAt(searchPath.length - 1) === "/"
        ? trimedSearchPath
        : trimedSearchPath + "/";

    const ret = await Promise.all(
      files.map(async (filePath, index) => {
        const prefix = extractCommonPrefix(pathPrefix, filePath);
        const fileName = filePath.substring(prefix.length);

        return await this.processXMLFile(filePath, fileName, index);
      })
    );
    return ret.filter((val) => val !== null);
  };

  processXMLFile = async (
    filePath: string,
    fileName: string,
    index: number
  ): Promise<XmlFile> => {
    let fileData;
    try {
      fileData = await fsPromises.readFile(filePath, "utf8");
    } catch (e) {
      return null;
    }

    const rootPath = `${index}`;
    let processedFileResult;
    try {
      processedFileResult = this.processXMLData(
        fileData,
        fileName,
        rootPath,
        FAMILY.NONE
      );
      processedFileResult.rootNode.tagColor = undefined;
    } catch (e) {
      const rootNode = new XmlTag(fileName);
      rootNode.setId(rootPath);
      rootNode.setStart(0);
      rootNode.setEnd(fileData.length - 1);
      const pathValueMap: { [path: string]: [XmlTag, XmlTag] } = {
        [rootPath]: [rootNode, null],
      };
      const pathStatusMap: { [path: string]: [boolean, boolean] } = {
        [rootPath]: [false, false],
      };

      processedFileResult = {
        rootNode,
        pathValueMap,
        pathStatusMap,
        xmlData: fileData,
      };
    }

    return processedFileResult;
  };

  processXMLData = (
    xmlData: string,
    rootTagName: string,
    rootPath: string,
    family: FAMILY,
    startOffset: number = 0,
    valueIndex?: 0 | 1
  ) => {
    const xmlRootTag = new XmlTag(rootTagName);
    xmlRootTag.setId(rootPath);
    xmlRootTag.setStart(startOffset);
    xmlRootTag.setEnd(startOffset + xmlData.length - 1);

    const pathMaps: PathMaps = {
      pathValueMap: { [rootPath]: [xmlRootTag, null] },
      pathStatusMap: { [rootPath]: [false, false] },
    };

    const parseRootTag = parseXML(xmlData, startOffset);
    const processedRoots = this.processXMLTree(
      parseRootTag.children,
      pathMaps,
      rootPath,
      family,
      valueIndex
    );

    if (Array.isArray(processedRoots)) {
      xmlRootTag.children = processedRoots;
    } else if (processedRoots !== null) {
      xmlRootTag.children = [processedRoots];
    }

    return {
      rootNode: xmlRootTag,
      xmlData,
      ...pathMaps,
    };
  };

  processXMLTree = (
    node: XmlTag | XmlTag[],
    pathMaps: PathMaps,
    path: string,
    family: FAMILY,
    valueIndex?: 0 | 1
  ): any => {
    if (!node || typeof node !== "object") {
      return null;
    }

    if (Array.isArray(node)) {
      const noNameTagIndexMap: any = {};
      return aggregateNodesByName(
        node
          .map((child, index) => {
            const name = child.attr.name;
            let childPath;
            if (!name) {
              const tagIndex = (noNameTagIndexMap[child.tagName] || 0) + 1;
              noNameTagIndexMap[child.tagName] = tagIndex;
              childPath = `${path}-<${child.tagName}>-${tagIndex}`;
            } else {
              childPath = `${path}-<${child.tagName}>-${name}`;
            }
            return this.processXMLTree(
              child,
              pathMaps,
              childPath,
              family,
              valueIndex
            );
          })
          .filter((child) => child !== null)
      );
    }

    node.setId(path);
    const familyAttr = node.attr.family;
    const curFamily = familyAttr ? getDBFamily(familyAttr) : family;

    const newNode = XmlTag.clone(node);
    newNode.id = path;

    buildPathMaps(newNode, pathMaps, path, curFamily, valueIndex);

    newNode.children = this.processXMLTree(
      node.children,
      pathMaps,
      path,
      curFamily
    );

    return newNode;
  };
}

export const getAncestors = (
  id: string,
  pathValueMap: { [path: string]: [XmlTag, XmlTag] }
) => {
  if (!pathValueMap) {
    return [];
  }
  const paths = [];
  let pathStr = id;

  do {
    const valuePair = pathValueMap[pathStr];

    if (valuePair) {
      paths.push(valuePair);
    }

    const index = pathStr.lastIndexOf("-<");
    if (index !== -1) {
      pathStr = pathStr.substring(0, index);
    } else {
      pathStr = "";
    }
  } while (pathStr);

  return paths.reverse();
};

const aggregateNodeFunc = (
  node: XmlTag,
  nodeIndex: number,
  namePairMap: { [key: string]: [XmlTag, XmlTag] },
  noNameTagIndexMap: { [tagName: string]: [number, number] },
  insertIndex?: 0 | 1
) => {
  const attrName = node.attr.name;
  let index;
  if (insertIndex !== undefined) {
    index = insertIndex;
  } else {
    const family = getDBFamily(node.attr.family);
    index = family === FAMILY.POSTGRES ? 1 : 0;
  }
  let key;
  if (attrName) {
    key = `<${node.tagName}>-${attrName}`;
  } else {
    const tagIndexPair = noNameTagIndexMap[node.tagName] || [0, 0];
    const tagIndex = tagIndexPair[index];
    key = `<${node.tagName}>-~~~${tagIndex}`;

    tagIndexPair[index]++;
    noNameTagIndexMap[node.tagName] = tagIndexPair;
  }
  const valuePair = namePairMap[key] || [null, null];

  if (!(key in namePairMap)) {
    namePairMap[key] = valuePair;
  }

  valuePair[index] = node;
};

export const aggregateSameNamePair = (node1: XmlTag, node2: XmlTag) => {
  if (!node1) {
    return node2;
  }
  if (!node2) {
    return node1;
  }

  const copyNode = new XmlTag(node1.tagName);
  copyNode.id = node1.id;
  copyNode.appendAttr("name", node1.attr.name);
  const childTagValMap: { [key: string]: [XmlTag, XmlTag] } = {};
  const noNameTagIndexMap: { [key: string]: [number, number] } = {};

  node1.children.forEach((node, index) => {
    aggregateNodeFunc(node, index, childTagValMap, noNameTagIndexMap, 0);
  });
  node2.children.forEach((node, index) => {
    aggregateNodeFunc(node, index, childTagValMap, noNameTagIndexMap, 1);
  });

  const aggregatedChildren = Object.values(childTagValMap).map(
    (childPair: [XmlTag, XmlTag]) =>
      aggregateSameNamePair(childPair[0], childPair[1])
  );
  copyNode.children = aggregatedChildren;

  return copyNode;
};

export const aggregateNodesByName = (nodes: Array<XmlTag>) => {
  const map: any = {};
  const noNameTagIndexMap: any = {};

  nodes.forEach((node, index) =>
    aggregateNodeFunc(node, index, map, noNameTagIndexMap)
  );

  return Object.keys(map).map((key) => {
    return aggregateSameNamePair(map[key][0], map[key][1]);
  });
};

const buildPathMaps = (
  node: XmlTag,
  pathMaps: PathMaps,
  path: string,
  family: FAMILY,
  valueIndex?: 0 | 1
) => {
  const { pathValueMap, pathStatusMap } = pathMaps;
  const nodePair = pathValueMap[path] || [null, null];
  const statusPair = pathStatusMap[path] || [false, false];
  if (family !== FAMILY.NONE) {
    statusPair[family] = true;
  }
  if (valueIndex !== undefined) {
    nodePair[valueIndex] = node;
  } else {
    const index = family === FAMILY.POSTGRES ? 1 : 0;
    nodePair[index] = node;
  }

  if (!(path in pathValueMap)) {
    pathValueMap[path] = nodePair;
    pathStatusMap[path] = statusPair;
  }
};

const getDBFamily = (family: string) => {
  if (family) {
    const lowwer = family.toLowerCase();
    if (lowwer.indexOf("postgres") !== -1) {
      return FAMILY.POSTGRES;
    }
    if (lowwer.indexOf("oracle") !== -1) {
      return FAMILY.ORACLE;
    }
  }

  return FAMILY.NONE;
};

export const extractXmlFileIndex = (path: string) => {
  if (!path) {
    return NaN;
  }
  const endIndex = path.indexOf("-");
  const indexStr =
    endIndex !== -1 ? path.substring("file".length, endIndex) : path;
  return parseInt(indexStr, 10);
};

export default new XMLProcessor();
