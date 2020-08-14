import { ActionType } from "../actions";

const PLANNING_PATH = "";

const defaultState = {
  filePath: PLANNING_PATH ? PLANNING_PATH + "/src/com/adaptiveplanning" : "",
  className: "Dimension*",
};

const search = (state: any = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.CHANGE_SEARCH_FILE_PATH: {
      return Object.assign({}, state, {
        filePath: action.filePath,
      });
    }
    case ActionType.CHANGE_SEARCH_CLASS: {
      return Object.assign({}, state, {
        className: action.className,
      });
    }
    default:
      return state;
  }
};

export default search;
