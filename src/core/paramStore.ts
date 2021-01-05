import CryptoJS from "crypto-js";
import dataStore from "../apis/dataStore";
import { ParameterValue } from "../features/queryScan/queryScanSlice";

interface GetParamArgument {
  propPath?: string;
  propName?: string;
  stmts: string[];
}
export interface GetParamReturn {
  fromProps?: StoredParamsPair;
  fromStmts?: StoredParamsPair;
}
interface SaveParamArgument extends GetParamArgument {
  paramsPair: [ParameterValue[], ParameterValue[]];
}
export type StoredParams = {
  timestamp: number;
  value: string[];
};

type StoredParamsList = StoredParams[];

type StoredParamsPair = [StoredParamsList, StoredParamsList];

const MAX_SIZE = 10;
const NUM_OF_SAMP_CHAR = 10;

const processStatement = (statement: string) => {
  const trimmedStmt = statement.replace(/\s/g, "");
  const splitted = trimmedStmt.split("?");

  const processed =
    splitted.length === 1
      ? splitted[0]
      : splitted.reduce((agg, cur, index) => {
          let curVal = "";
          if (index === 0) {
            if (cur.length < NUM_OF_SAMP_CHAR) {
              curVal = cur;
            } else {
              curVal = cur.substr(cur.length - NUM_OF_SAMP_CHAR);
            }
          } else if (index === splitted.length - 1) {
            if (cur.length < NUM_OF_SAMP_CHAR) {
              curVal = cur;
            } else {
              curVal = cur.substr(0, NUM_OF_SAMP_CHAR);
            }
          } else {
            if (cur.length < 2 * NUM_OF_SAMP_CHAR) {
              curVal = cur;
            } else {
              curVal =
                cur.substr(0, NUM_OF_SAMP_CHAR) +
                cur.substr(cur.length - NUM_OF_SAMP_CHAR);
            }
          }

          return agg + curVal;
        }, "");

  const shasum = CryptoJS.SHA1(processed);
  return shasum.toString(CryptoJS.enc.Hex);
};

const getParamPairFromProps = async (
  propPath: string,
  propName: string,
  paramCountPair: [number, number]
): Promise<StoredParamsPair | null> => {
  const propsKey = `${propPath}#${propName}`;
  const storedParamsString = await dataStore.getItem(propsKey);
  if (storedParamsString == null) {
    return null;
  }

  const storedParamsPair: StoredParamsPair = JSON.parse(storedParamsString);
  return storedParamsPair.map((storedParamsList, index) => {
    const paramCount = paramCountPair[index];
    return storedParamsList.filter(
      (storedParams) => storedParams.value.length === paramCount
    );
  }) as StoredParamsPair;
};

const getStmtParamsList = async (
  stmtKey: string,
  paramCount: number
): Promise<StoredParamsList> => {
  const storedString = await dataStore.getItem(stmtKey);
  if (storedString == null) {
    return [];
  }

  const storedParamsList: StoredParamsList = JSON.parse(storedString);

  return storedParamsList.filter(
    (params) => params.value.length === paramCount
  );
};

const mapStmtKeyPair = (stmt: string, index: number) => {
  const processedStmt = processStatement(stmt);
  return `stmt${index}#${processedStmt}`;
};

export const getParamsPair = async ({
  propPath,
  propName,
  stmts
}: GetParamArgument): Promise<GetParamReturn | null> => {
  const ret: GetParamReturn = {};
  const paramCountPair = stmts.map((stmt) => stmt.split("?").length - 1) as [
    number,
    number
  ];
  if (propPath != null && propName != null) {
    const fromProps = await getParamPairFromProps(
      propPath,
      propName,
      paramCountPair
    );
    if (fromProps != null && fromProps.length > 0) {
      ret.fromProps = fromProps;
    }
  }

  const stmtKeyPair = stmts.map(mapStmtKeyPair);

  const fromStmts = (await Promise.all(
    stmtKeyPair.map((stmtKey, index) =>
      getStmtParamsList(stmtKey, paramCountPair[index])
    )
  )) as StoredParamsPair;

  if (fromStmts.filter((paramsList) => paramsList.length > 0).length > 0) {
    ret.fromStmts = fromStmts;
  }

  if (Object.keys(ret).length === 0) {
    return null;
  }

  return ret;
};

export const saveParamsPair = async ({
  propPath,
  propName,
  stmts,
  paramsPair
}: SaveParamArgument) => {
  if (
    paramsPair == null ||
    paramsPair.filter((params) => params.length > 0).length === 0
  ) {
    return;
  }

  if (propPath != null && propName != null) {
    const propsKey = `${propPath}#${propName}`;
    const storedParamsString = await dataStore.getItem(propsKey);
    let storedParamsPair: StoredParamsPair = [[], []];
    if (storedParamsString != null) {
      storedParamsPair = JSON.parse(storedParamsString);
    }

    addParamsPairToStored(storedParamsPair, paramsPair);

    await dataStore.setItem(propsKey, JSON.stringify(storedParamsPair));
  }

  const stmtKeyPair = stmts.map(mapStmtKeyPair);
  const storedParamsPair: StoredParamsPair = (await Promise.all(
    stmts.map(async (stmt, index) => {
      const stmtKey = stmtKeyPair[index];
      const storedParamsListString = await dataStore.getItem(stmtKey);
      return storedParamsListString != null
        ? (JSON.parse(storedParamsListString) as StoredParamsList)
        : [];
    })
  )) as StoredParamsPair;

  addParamsPairToStored(storedParamsPair, paramsPair);

  await Promise.all(
    stmtKeyPair.map(async (stmtKey, index) => {
      return await dataStore.setItem(
        stmtKey,
        JSON.stringify(storedParamsPair[index])
      );
    })
  );
};

const addParamsPairToStored = (
  storedParamsPair: StoredParamsPair,
  paramsPair: [ParameterValue[], ParameterValue[]]
) => {
  const rawParamsPair = paramsPair.map((params) =>
    params.map((param) => param.raw)
  );
  const now = Date.now();
  rawParamsPair.forEach((rawParams, index) => {
    const rawParamsString = JSON.stringify(rawParams).toLowerCase();
    const storedParamsList = storedParamsPair[index];
    const replicatedIndex = storedParamsList.findIndex(
      (storedParams) =>
        JSON.stringify(storedParams.value).toLowerCase() === rawParamsString
    );

    if (replicatedIndex !== -1) {
      storedParamsList.splice(replicatedIndex, 1);
    }

    storedParamsList.push({
      timestamp: now,
      value: rawParams
    });

    if (storedParamsList.length > MAX_SIZE) {
      storedParamsList.shift();
    }
  });
};
