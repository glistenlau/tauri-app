import { createStyles, withStyles } from "@material-ui/styles";
import React from "react";
import { connect } from "react-redux";
import {
  changeParameters, closeParameterModal,



  evaluateParameter, scanRunQuery,


  toggleCartesian,
  toggleSync,

  validateParameters
} from "../actions";
import QueryParameterModal from "../components/QueryParameterModal";
import { RootState } from "../reducers";
import { getEffectiveStatements, getParameterCount } from "../util";

const styles: any = (theme: any) => createStyles({});

export enum ParameterStatus {
  Active = "active",
  Valid = "valid",
  Error = "error",
}

type EvalatedParams =
  | {
      success: true;
      value: Array<any>;
    }
  | { success: false; errorMessage: string };

export interface Parameter {
  raw: string;
  evaluated?: EvalatedParams;
  status?: ParameterStatus;
  row: number;
  col: number;
}

export interface QueryRunnerPropsType {
  dispatch: Function;
  currentValues: Array<string>;
  schema: string;
  statements: Array<string>;
  cartesian: boolean;
  sync: boolean;
  parameters: Array<Array<Parameter>>;
  openParameterModal: boolean;
  result: any;
}
class QueryRunner extends React.Component<any, any> {
  handleModelClose = async (run: boolean) => {
    const {
      dispatch,
      currentValues,
      selectedClassPath,
      selectedPropName,
      parameters,
      statements,
      navigator: { activeView },
    } = this.props;
    const effectiveStatements = getEffectiveStatements(currentValues);
    const currentParametersCount = getParameterCount(effectiveStatements);

    if (
      activeView === 0 &&
      parameters[0].length === currentParametersCount[0] &&
      parameters[1].length === currentParametersCount[1]
    ) {
    } else {
    }

    if (run) {
      const validRet = await this.validateParameters();
      if (validRet[0] && validRet[1]) {
        dispatch(closeParameterModal());
        this.runQuery();
      }
    } else {
      dispatch(closeParameterModal());
    }
  };

  validateParameters = async () => {
    const { dispatch, parameters, runnerControl } = this.props;
    return await dispatch(validateParameters(parameters, runnerControl.schema));
  };

  runQuery = async () => {
    const {
      dispatch,
      statements,
      parameters,
      cartesian,
      runnerControl,
    } = this.props;
    await dispatch(
      scanRunQuery(
        statements,
        parameters,
        runnerControl.schema,
        cartesian,
        runnerControl.sortResults
      )
    );
  };

  handleParametersChange = (params: Array<Array<Parameter>>) => {
    const { dispatch } = this.props;

    dispatch(changeParameters(params));
  };

  handleCartesianChange = () => {
    const { dispatch } = this.props;

    dispatch(toggleCartesian());
  };

  handleSyncChange = () => {
    const { dispatch } = this.props;

    dispatch(toggleSync());
  };

  handleEditorBlur = async (
    params: Array<Array<Parameter>>,
    dbIndex: number,
    paramIndex: number
  ) => {
    const { runnerControl, sync, dispatch } = this.props;
    const mode = sync ? 2 : dbIndex;
    await dispatch(
      evaluateParameter(params, paramIndex, runnerControl.schema, mode)
    );
  };

  handleCopyParams = async (params: Array<Array<Parameter>>) => {
    const { runnerControl, dispatch } = this.props;
    await dispatch(validateParameters(params, runnerControl.schema));
  };

  render() {
    const {
      openParameterModal,
      statements,
      parameters,
      cartesian,
      sync,
    } = this.props;
    return (
      <QueryParameterModal
        cartesian={cartesian}
        sync={sync}
        open={openParameterModal}
        statements={statements}
        parameters={parameters}
        onClose={this.handleModelClose}
        onCartesianChange={this.handleCartesianChange}
        onSyncChange={this.handleSyncChange}
        onEditorBlur={this.handleEditorBlur}
        onCopyParams={this.handleCopyParams}
      />
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    ...state.queryRunner,
    selectedClassPath: state.editor.selectedClassPath,
    selectedPropName: state.editor.selectedPropName,
    currentValues: state.editor.values,
    runnerControl: state.runnerControl,
    navigator: state.navigator,
  };
};

const connector = connect(mapStateToProps);

export default connector(withStyles(styles, { withTheme: true })(QueryRunner));
