import { ActionType } from "../actions";

const defaultState = {
  oracleSetting: {
    host: "localhost",
    port: "1521",
    sid: "anaconda",
    user: "ANACONDA",
    password: "ANACONDA",
  },
  postgresSetting: {
    host: "localhost",
    port: "5432",
    database: "planning",
    user: "postgres",
    password: "#postgres#",
  },
};

const search = (state: any = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.CHANGE_ACTIVE_VIEW: {
      return Object.assign({}, state, {
        activeView: action.activeView,
      });
    }
    case ActionType.CHANGE_ORACLE_SETTING: {
      return Object.assign({}, state, {
        oracleSetting: action.oracleSetting,
      });
    }
    case ActionType.CHANGE_POSTGRES_SETTING: {
      return Object.assign({}, state, {
        postgresSetting: action.postgresSetting,
      });
    }
    default:
      return state;
  }
};

export default search;
