import { ActionType } from "../actions";
import { Parameter } from "../containers/QueryRunner";

export type TimeElapsed = [number, number];
export type TimeElapsedPair = [TimeElapsed, TimeElapsed];

const getSyncedParam = (oraParam: Parameter, pgParam: Parameter) => {
  if (!oraParam.raw.trim()) {
    return {
      raw: pgParam.raw.trim(),
      evaluated: {},
    };
  }

  return {
    raw: oraParam.raw.trim(),
    evaluated: {},
  };
};

interface QueryRunnerState {
  statements: [string, string];
  parameters: [Array<any>, Array<any>];
  runningParameters: [Array<any>, Array<any>];
  timeElapsedPair: [[number, number], [number, number]];
  cartesian: boolean;
  sync: boolean;
  openParameterModal: boolean;
  expandResultPanel: boolean;
  rowCount: number;
  result: any;
  processed: number;
  total: number;
}

const defaultState: QueryRunnerState = {
  statements: ["", ""],
  parameters: [[], []],
  runningParameters: [[], []],
  timeElapsedPair: [
    [0, 0],
    [0, 0],
  ],
  cartesian: false,
  sync: true,
  openParameterModal: false,
  expandResultPanel: false,
  rowCount: 0,
  result: {},
  processed: 0,
  total: 0,
};

const queryRunner = (state: QueryRunnerState = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.INIT_APP: {
      return Object.assign({}, defaultState, state);
    }
    case ActionType.CHANGE_PARAMETER_RAW: {
      const oldParams = state.parameters || [[], []];
      const oldDBParams = oldParams[action.dbIndex];
      const oldParam = oldDBParams && oldDBParams[action.paramIndex];

      if (!oldParam) {
        return state;
      }

      const newParam = Object.assign({}, oldParam, { raw: action.raw });
      const newDBParams = [
        ...oldDBParams.slice(0, action.paramIndex),
        newParam,
        ...oldDBParams.slice(action.paramIndex + 1),
      ];
      const newParameters = [
        ...state.parameters.slice(0, action.dbIndex),
        newDBParams,
        ...state.parameters.slice(action.dbIndex + 1),
      ];

      return Object.assign({}, state, {
        parameters: newParameters,
      });
    }
    case ActionType.CHANGE_PARAMETERS: {
      return Object.assign({}, state, {
        parameters: action.parameters,
      });
    }
    case ActionType.OPEN_PARAMETER_MODAL: {
      const statements = action.statements || defaultState.statements;
      const parameters = action.parameters || defaultState.parameters;

      return Object.assign({}, state, {
        openParameterModal: true,
        statements,
        parameters,
        sync: action.sync,
        cartesian: false,
      });
    }

    case ActionType.CLOSE_PARAMETER_MODAL: {
      return Object.assign({}, state, {
        openParameterModal: false,
      });
    }
    case ActionType.TOOGLE_CARTESIAN: {
      return Object.assign({}, state, {
        cartesian: !state.cartesian,
      });
    }
    case ActionType.TOOGLE_SYNC: {
      if (!state.sync) {
        const newParams: Array<Array<Parameter>> = [[], []];
        const oraParam = state.parameters[0];
        const pgParam = state.parameters[1];
        const len = oraParam.length;

        for (let i = 0; i < len; i++) {
          const syncedParam = getSyncedParam(oraParam[i], pgParam[i]);
          newParams[0].push(Object.assign({}, oraParam[i], syncedParam));
          newParams[1].push(Object.assign({}, pgParam[i], syncedParam));
        }
        return Object.assign({}, state, {
          parameters: newParams,
          sync: !state.sync,
        });
      }
      return Object.assign({}, state, {
        sync: !state.sync,
      });
    }
    default:
      return state;
  }
};

export default queryRunner;
