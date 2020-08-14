import { ActionType, EditorMode } from "../actions";
import {
  getOraclePathFromClassPath,
  getPostgresPathFromClassPath,
} from "../util";

const extractClassPathList = (oracleObj: PropsObj, postgresObj: PropsObj) => {
  const oracleClassPathList = oracleObj
    ? Object.keys(oracleObj).map((oracleFilePath) =>
        oracleFilePath.substring(
          0,
          oracleFilePath.indexOf(".oracle.properties")
        )
      )
    : [];

  const postgresClassPathList = postgresObj
    ? Object.keys(postgresObj).map((postgresFilePath) =>
        postgresFilePath.substring(
          0,
          postgresFilePath.indexOf(".pg.properties")
        )
      )
    : [];

  const classPathList = oracleClassPathList.concat(
    postgresClassPathList.filter(
      (path) => oracleClassPathList.indexOf(path) === -1
    )
  );

  return classPathList;
};

const extractPropNameList = (
  oracleObj: PropsObj,
  postgresObj: PropsObj,
  selectedClassPath: string
): any[] => {
  if (!selectedClassPath) {
    return [];
  }
  const oraclePath = getOraclePathFromClassPath(selectedClassPath);
  const postgresPath = getPostgresPathFromClassPath(selectedClassPath);

  const oraclePathProps = oracleObj && oracleObj[oraclePath];
  const oraclePropNameList =
    (oraclePathProps && Object.keys(oraclePathProps)) || [];

  const postgresPathProps = postgresObj && postgresObj[postgresPath];
  const postgresPropNameList =
    (postgresPathProps && Object.keys(postgresPathProps)) || [];

  const result: any = {};
  oraclePropNameList.forEach((name) => {
    const val = result[name] || {};
    val.propName = name;
    val.oracle = true;
    result[name] = val;
  });

  postgresPropNameList.forEach((name) => {
    const val = result[name] || {};
    val.propName = name;
    val.postgres = true;
    result[name] = val;
  });

  return Object.values(result);
};

const getPropValue = (obj: PropsObj, filePath: string, propKey: string) => {
  if (!obj || !obj[filePath] || !obj[filePath][propKey]) {
    return "";
  }

  return obj[filePath][propKey];
};

export const getOraclePropValue = (
  obj: PropsObj,
  classPath: string,
  propKey: string
) => {
  const filePath = `${classPath}.oracle.properties`;
  return getPropValue(obj, filePath, propKey);
};

export const getPostgresPropValue = (
  obj: PropsObj,
  classPath: string,
  propKey: string
) => {
  const filePath = `${classPath}.pg.properties`;
  return getPropValue(obj, filePath, propKey);
};

const setPropValue = (
  obj: PropsObj,
  filePath: string,
  propKey: string,
  propValue: string
) => {
  if (!obj) {
    return;
  }

  if (!obj[filePath]) {
    obj[filePath] = {};
  }

  const props = obj[filePath];
  props[propKey] = propValue;
};

const setOraclePropValue = (
  obj: PropsObj,
  classPath: string,
  propKey: string,
  propValue: string
) => {
  const filePath = getOraclePathFromClassPath(classPath);
  setPropValue(obj, filePath, propKey, propValue);
};

const setPostgresPropValue = (
  obj: PropsObj,
  classPath: string,
  propKey: string,
  propValue: string
) => {
  const filePath = getPostgresPathFromClassPath(classPath);
  setPropValue(obj, filePath, propKey, propValue);
};

const defaultState: StateType = {
  oracleProps: {},
  postgresProps: {},
  validateResults: {},
  classPathList: [],
  propNameList: [],
  selectedClassPath: "",
  selectedPropName: "",
  values: ["", ""],
  leftPanelWidth: 300,
  mode: EditorMode.NORMAL,
};

export interface PropsObj {
  [key: string]: {
    [key: string]: string;
  };
}

export interface StateType {
  oracleProps: PropsObj;
  postgresProps: PropsObj;
  classPathList: Array<string>;
  propNameList: Array<string>;
  selectedClassPath: string;
  selectedPropName: string;
  validateResults: any;
  values: Array<string>;
  mode: EditorMode;
  leftPanelWidth: number;
}

const editor = (state: StateType = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.INIT_APP: {
      return Object.assign({}, defaultState, state);
    }
    case ActionType.CHANGE_LEFT_PANEL_WIDTH: {
      return Object.assign({}, state, {
        leftPanelWidth: action.width,
      });
    }
    case ActionType.LOAD_PROPS_FILES: {
      const classPathList = extractClassPathList(
        action.oracleProps,
        action.postgresProps
      );
      const selectedClassPath =
        classPathList.length > 0 ? classPathList[0] : "";
      const propNameList = extractPropNameList(
        action.oracleProps,
        action.postgresProps,
        selectedClassPath
      );
      const selectedPropName =
        propNameList.length > 0 ? propNameList[0].propName : "";
      const oracleValue = getOraclePropValue(
        action.oracleProps,
        selectedClassPath,
        selectedPropName
      );
      const postgresValue = getPostgresPropValue(
        action.postgresProps,
        selectedClassPath,
        selectedPropName
      );

      return Object.assign({}, state, {
        oracleProps: action.oracleProps || {},
        postgresProps: action.postgresProps || {},
        validateResults: action.validateResults || {},
        classPathList,
        propNameList,
        selectedClassPath,
        selectedPropName,
        values: [oracleValue, postgresValue],
      });
    }
    case ActionType.SELECT_PROP_KEY: {
      const {
        oracleProps,
        postgresProps,
        selectedClassPath,
        selectedPropName,
      } = state;
      const propKey = action.propKey;

      if (selectedPropName === propKey) {
        return state;
      }

      const oracleValue = getOraclePropValue(
        oracleProps,
        selectedClassPath,
        propKey
      );
      const postgresValue = getPostgresPropValue(
        postgresProps,
        selectedClassPath,
        propKey
      );

      return Object.assign({}, state, {
        selectedPropName: propKey,
        values: [oracleValue, postgresValue],
      });
    }
    case ActionType.SELECT_CLASS_NAME: {
      const { oracleProps, postgresProps, selectedClassPath } = state;

      const classPath = action.className;

      if (selectedClassPath === classPath) {
        return state;
      }

      const propNameList = extractPropNameList(
        oracleProps,
        postgresProps,
        classPath
      );

      const selectedPropName =
        propNameList.length > 0 ? propNameList[0].propName : "";

      const oracleValue = getOraclePropValue(
        oracleProps,
        classPath,
        selectedPropName
      );
      const postgresValue = getPostgresPropValue(
        postgresProps,
        classPath,
        selectedPropName
      );

      return Object.assign({}, state, {
        propNameList,
        selectedPropName,
        selectedClassPath: classPath,
        values: [oracleValue, postgresValue],
      });
    }
    case ActionType.CHANGE_PROP_VALUE: {
      const {
        oracleProps,
        postgresProps,
        selectedClassPath,
        selectedPropName,
      } = state;
      setOraclePropValue(
        oracleProps,
        selectedClassPath,
        selectedPropName,
        action.values[0]
      );
      setPostgresPropValue(
        postgresProps,
        selectedClassPath,
        selectedPropName,
        action.values[1]
      );

      return Object.assign({}, state, {
        values: action.values,
      });
    }
    default: {
      return state;
    }
  }
};

export default editor;
