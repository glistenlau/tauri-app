import JavaProperties from "./javaProperties";
import fs from "fs";
import glob from "glob";

function readdirPromise(path: fs.PathLike): Promise<fs.Dirent[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(
      path,
      { encoding: "utf8", withFileTypes: true },
      (err, files) => {
        if (err) {
          return reject(err);
        }

        resolve(files);
      }
    );
  });
}

export async function searchFile(searchPath: string, target: string) {
  let results: string[] = [];
  try {
    const dirents = await readdirPromise(searchPath);

    await Promise.all(
      dirents.map(async (dirent) => {
        if (dirent.isDirectory()) {
          const subDir = `${searchPath}/${dirent.name}`;
          const subResults = await searchFile(subDir, target);

          results = results.concat(subResults);
        } else if (dirent.name === target) {
          const filePath = `${searchPath}/${dirent.name}`;

          results.push(filePath);
        }
      })
    );

    // for (const dirent of dirents) {
    //   if (dirent.isDirectory()) {
    //     const subDir = `${searchPath}/${dirent.name}`;
    //     const subResults = await searchFile(subDir, target);

    //     results = results.concat(subResults);
    //   } else if (dirent.name === target) {
    //     const filePath = `${searchPath}/${dirent.name}`;

    //     results.push(filePath);
    //   }
    // }
  } catch (e) {
  }

  return results;
}

const globFile = (searchPath: string, target: string): Promise<string[]> => {
  const searchPatern = `${searchPath}/**/${target}`;

  return new Promise((resolve, reject) => {
    glob(searchPatern, { nocase: true }, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

async function searchAndLoadProperties(searchPath: string, fileName: string) {
  const searchResults = await globFile(searchPath, fileName);

  return (
    await Promise.all(
      searchResults.map(async (filePath) => {
        const reader = new JavaProperties(filePath);
        return await reader.read();
      })
    )
  ).reduce(
    (acc: { [key: string]: { [key: string]: string } }, curVal, curIndex) => {
      acc[searchResults[curIndex]] = curVal;
      return acc;
    },
    {}
  );
}

export async function loadOracleProperties(
  searchPath: string,
  className: string
) {
  const fileName = `${className}.oracle.properties`;
  const results = await searchAndLoadProperties(searchPath, fileName);

  return results;
}

export async function loadPostgresProperties(
  searchPath: string,
  className: string
) {
  const fileName = `${className}.pg.properties`;
  const results = await searchAndLoadProperties(searchPath, fileName);

  return results;
}

export const writeOracleProp = async (
  classPath: string,
  propKey: string,
  propVal: string
) => {
  if (!propVal || propVal.length === 0) {
    throw new Error("Property value is empty.");
  }

  const filePath = `${classPath}.oracle.properties`;
  const jp = new JavaProperties(filePath);
  await jp.writeProp(propKey, propVal);
};

export const writePgProp = async (
  classPath: string,
  propKey: string,
  propVal: string
) => {
  if (!propVal || propVal.length === 0) {
    throw new Error("Property value is empty.");
  }

  const filePath = `${classPath}.pg.properties`;
  const jp = new JavaProperties(filePath);
  await jp.writeProp(propKey, propVal);
};
