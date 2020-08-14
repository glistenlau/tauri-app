import { ActionType } from "../actions";

const defaultState = {
  activeView: 0,
};

const search = (state: any = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.CHANGE_ACTIVE_VIEW: {
      return Object.assign({}, state, {
        activeView: action.activeView,
      });
    }

    default:
      return state;
  }
};

export default search;
