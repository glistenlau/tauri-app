import { createStyles, withStyles } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import React from "react";
import { Resizable } from "re-resizable";
import { connect } from "react-redux";
import {
  changeSearchClassName,
  changeSearchFilePath,
  openParameterModal,
  saveProp,
  searchProps,
  selectClassName,
  selectPropKey,
  changePropValue,
  scanRunQuery,
  changeLeftPanelWidth,
  showNotification,
} from "../actions";
import ClassSelect from "../components/ClassSelect";
import EditorToolBar from "../components/EditorToolBar";
import PropNameList from "../components/PropNameList";
import SearchBar from "../components/SearchBar";
import SplitEditor from "../components/SplitEditor";
import { format } from "../core/formatter";

import { getParameterMarkerPosition } from "../util";
import { evaluateParamsPair } from "../core/parameterEvaluator";
import CopyDialog from "../components/CopyDialog";
import SaveDialog from "../components/SaveDialog";
import {
  changeSortResults,
  changeSchema,
} from "../features/runnerControl/runnerControlSlice";
import { RootState } from "../reducers";

const styles: any = (theme: any) =>
  createStyles({
    container: {
      backgroundColor: theme.palette.background.paper,
      height: "50%",
      overflow: "hidden",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      flex: 1,
    },
    containerHide: {
      height: 0,
      width: 0,
      overflow: "hidden",
    },
    button: {
      width: 48,
      height: 48,
    },
    searchBar: {
      padding: 10,
    },
    hideQueryRunner: {},
    paper: {
      flex: 1,
      backgroundColor: theme.palette.background.paper,
      height: "40%",
      display: "flex",
      flexDirection: "column",
    },
    queryResultContainer: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "column",
    },
    editorContainer: {
      display: "flex",
      flexDirection: "row",
      flex: 1,
      height: "40%",
      width: "100%",
    },
    leftContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
    },
    rightContainer: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flex: 1,
      flexDirection: "column",
      height: "100%",
      width: "10%",
    },
    runnerToolBar: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },
    runningProcess: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    },
    divider: {
      cursor: "ns-resize !important",
      pointerEvent: "auto",
      height: 2,
      backgroundColor: "red",
    },
  });

class DiffEditor extends React.Component<any, any> {
  editorRefs: Array<any>;

  constructor(props: any) {
    super(props);
    this.editorRefs = new Array(2);
    this.state = {
      diffCode: false,
      saveDialogOpen: false,
      saveDialogError: null,
      copyDialogOpen: false,
    };
  }

  foramtCode = (text: string) => {
    return format(text);
  };

  handleCopyClassPath = (dbName: string) => {
    const { selectedClassPath } = this.props;
    clipboard.write({ text: `${selectedClassPath}.${dbName}.properties` });
  };

  handleCopyPropName = () => {
    const { selectedPropName } = this.props;
    clipboard.write({ text: selectedPropName });
  };

  handleEditorRef = (e: any, index: number) => {
    const dbName = index === 0 ? "oracle" : "pg";
    e &&
      e.addAction({
        id: `copyPropsPath${index}`,
        label: "Copy Props File Path",
        contextMenuGroupId: "propsGroup",
        run: () => this.handleCopyClassPath(dbName),
      });

    e &&
      e.addAction({
        id: "copyPropName",
        label: "Copy Prop Name",
        contextMenuGroupId: "propsGroup",
        run: this.handleCopyPropName,
      });

    this.editorRefs[index] = e;
  };

  handleSearch = async (filePath: string, className: string) => {
    const { dispatch } = this.props;

    await dispatch(searchProps(filePath, className));
  };

  handleSelectClassPath = (classPath: string) => {
    const { dispatch } = this.props;

    dispatch(selectClassName(classPath));
  };

  handleSelectPropName = (propName: string) => {
    const { dispatch } = this.props;

    dispatch(selectPropKey(propName));
  };

  handleBlur = (valuePair: [string, string]) => {
    const { dispatch } = this.props;

    dispatch(changePropValue(valuePair));
  };

  handleClickFormat = () => {
    const { dispatch, values } = this.props;
    const newValues: [string, string] = [
      this.foramtCode(values[0]),
      this.foramtCode(values[1]),
    ];

    dispatch(changePropValue(newValues));
  };

  handleToggleDiffCode = () => {
    this.setState({
      diffCode: !this.state.diffCode,
    });
  };

  handleClickRun = async (sortResults?: any) => {
    const {
      values,
      dispatch,
      queryRunner,
      runnerControl,
      selectedClassPath,
      selectedPropName,
    } = this.props;
    const selected = this.editorRefs.map((editor: any) => {
      if (!editor) {
        return null;
      }

      const selections: Array<any> = editor.getSelections();
      if (!selections) {
        return null;
      }

      return selections
        .map((s: any) => editor.getModel().getValueInRange(s))
        .join("");
    });

    const oraStatement: string = selected[0] ? selected[0] : values[0];
    let pgStatement = selected[1] ? selected[1] : values[1];

    if (pgStatement.trim().length === 0) {
      pgStatement = oraStatement;
    }

    let storedParams: any = null;

    let oraParams = getParameterMarkerPosition(oraStatement).map((p) => ({
      ...p,
      raw: "",
      evaluated: {},
    }));
    let pgParams = getParameterMarkerPosition(pgStatement).map((p) => ({
      ...p,
      raw: "",
      evaluated: {},
    }));

    if (
      !storedParams ||
      storedParams.oracle.length !== oraParams.length ||
      storedParams.postgres.length !== pgParams.length
    ) {
      const extraParams:any = null;
      if (
        extraParams?.oracle?.length === oraParams.length &&
        storedParams?.oracle?.length !== oraParams.length
      ) {
        storedParams.oracle = extraParams.oracle;
      }
      if (
        extraParams?.postgres?.length === pgParams.length &&
        storedParams?.postgres?.length !== pgParams.length
      ) {
        storedParams.postgres = extraParams.postgres;
      }
    }

    if (storedParams?.oracle && !storedParams?.postgres) {
      storedParams.postgres = storedParams.oracle;
    }

    if (storedParams?.postgres && !storedParams?.oracle) {
      storedParams.oracle = storedParams.postgres;
    }

    if (
      storedParams &&
      storedParams.oracle &&
      storedParams.oracle.length === oraParams.length
    ) {
      oraParams = oraParams.map((p, i) =>
        Object.assign({}, p, storedParams.oracle[i])
      );
    }

    if (
      storedParams &&
      storedParams.postgres &&
      storedParams.postgres.length === pgParams.length
    ) {
      pgParams = pgParams.map((p, i) =>
        Object.assign({}, p, storedParams.postgres[i])
      );
    }

    let sync = oraParams.length === pgParams.length;

    if (sync) {
      for (let i = 0; i < oraParams.length; i++) {
        if (oraParams[i].raw !== pgParams[i].raw) {
          sync = false;
          break;
        }
      }
    }

    const statements = [oraStatement, pgStatement];
    let parameters: any = [oraParams, pgParams];
    parameters = await evaluateParamsPair(parameters, runnerControl.schema);

    dispatch(changeSortResults(sortResults));

    if (
      (oraParams && oraParams.length > 0) ||
      (pgParams && pgParams.length > 0)
    ) {
      dispatch(openParameterModal(statements, parameters, sync));
    } else {
      await dispatch(
        scanRunQuery(
          statements,
          parameters,
          runnerControl.schema,
          queryRunner.cartesian,
          sortResults
        )
      );
    }
  };

  handleCopyDialogClose = (val?: number) => {
    const { dispatch, values, runnerControl } = this.props;

    if (val !== undefined) {
      let replaced = values[val].replace(
        /COMPANY_/gi,
        `${runnerControl.schema}.`
      );
      clipboard.write({ text: replaced });

      dispatch(showNotification("Statement copied to clipboard.", "success"));
    }

    this.setState({
      copyDialogOpen: false,
    });
  };

  handleClickCopy = () => {
    this.setState({
      copyDialogOpen: true,
    });
  };

  handleClickSave = () => {
    this.setState({
      saveDialogOpen: true,
      saveDialogError: null,
    });
  };

  handleSaveDialogClose = async (confirmVal?: number) => {
    const {
      dispatch,
      values,
      selectedClassPath,
      selectedPropName,
    } = this.props;

    if (confirmVal === undefined) {
      this.setState({
        saveDialogOpen: false,
      });
    } else {
      const ret = await dispatch(
        saveProp(selectedClassPath, selectedPropName, values, confirmVal)
      );

      const postgresSuccess = !ret.postgres || ret.postgres.success;
      const oracleSuccess = !ret.oracle || ret.oracle.success;
      if (postgresSuccess && oracleSuccess) {
        this.setState({
          saveDialogOpen: false,
        });
      } else {
        this.setState({
          saveDialogError: ret,
        });
      }
    }
  };

  handleFilePathChange = (filePath: string) => {
    const { dispatch } = this.props;
    dispatch(changeSearchFilePath(filePath));
  };

  handleClassNameChange = (className: string) => {
    const { dispatch } = this.props;
    dispatch(changeSearchClassName(className));
  };

  handleSchemaChange = (schema: string) => {
    const { dispatch } = this.props;
    dispatch(changeSchema(schema));
  };

  handleLeftPanelResize = (e: any, direction: any, ref: any, d: any) => {
    const { dispatch, leftPanelWidth } = this.props;
    const width = leftPanelWidth + d.width;
    dispatch(changeLeftPanelWidth(width));
  };

  render() {
    const {
      classes,
      classPathList,
      selectedClassPath,
      propNameList,
      selectedPropName,
      search,
      validateResults,
      leftPanelWidth,
      active,
      values,
    } = this.props;

    const {
      diffCode,
      copyDialogOpen,
      saveDialogError,
      saveDialogOpen,
    } = this.state;

    const propsValidateReults =
      (validateResults && validateResults[selectedClassPath]) || null;
    const propValidateResult =
      (propsValidateReults && propsValidateReults[selectedPropName]) || null;

    return (
      <div className={active ? classes.container : classes.containerHide}>
        <div className={classes.editorContainer}>
          <Resizable
            className={classes.leftContainer}
            onResizeStop={this.handleLeftPanelResize}
            size={{
              height: "100%",
              width: leftPanelWidth,
            }}
            minWidth={200}
            maxWidth="40vw"
            enable={{
              top: false,
              right: true,
              bottom: false,
              left: false,
              topRight: false,
              bottomRight: false,
              bottomLeft: false,
              topLeft: false,
            }}
          >
            <SearchBar
              searchFolderLabel="Search Folder"
              searchFileLabel="Java Class"
              filePathValue={search.filePath}
              fileNameValue={search.className}
              onFilePathChange={this.handleFilePathChange}
              onFileNameChange={this.handleClassNameChange}
              onSearch={this.handleSearch}
            />
            <ClassSelect
              onChange={this.handleSelectClassPath}
              selected={selectedClassPath}
              values={classPathList}
            />
            <Divider />
            <PropNameList
              propNameList={propNameList}
              selectedProp={selectedPropName}
              onListItemClick={this.handleSelectPropName}
              validateResults={propsValidateReults}
            />
          </Resizable>
          <Divider orientation="vertical" flexItem />

          <div className={classes.rightContainer}>
            <EditorToolBar
              diff={diffCode}
              onClickCopy={this.handleClickCopy}
              onClickFormat={this.handleClickFormat}
              onClickDiff={this.handleToggleDiffCode}
              onClickRun={this.handleClickRun}
              onClickSave={this.handleClickSave}
              validateResult={propValidateResult}
            />
            <Divider />
            <SaveDialog
              id="save-confirm-dialog"
              keepMounted
              value={0}
              open={saveDialogOpen}
              onClose={this.handleSaveDialogClose}
              error={saveDialogError}
              propName={selectedPropName}
            />
            <CopyDialog
              id="copy-confirm-dialog"
              keepMounted
              value={0}
              open={copyDialogOpen}
              onClose={this.handleCopyDialogClose}
            />
            <SplitEditor
              baseValues={values}
              onBlur={this.handleBlur}
              onEditorRef={this.handleEditorRef}
              diff={diffCode}
            />
          </div>
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: RootState, ownProps: any) => {
  return {
    ...ownProps,
    search: state.search,
    queryRunner: state.queryRunner,
    runnerControl: state.runnerControl,
    ...state.editor,
  };
};

export default connect(mapStateToProps)(
  withStyles(styles, { withTheme: true })(DiffEditor)
);
