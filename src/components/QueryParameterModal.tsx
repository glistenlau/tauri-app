import React from "react";
import Modal from "@material-ui/core/Modal";
import { makeStyles, createStyles } from "@material-ui/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import {
  Divider,
  Button,
  IconButton,
  FormControlLabel,
  Switch,
} from "@material-ui/core";
import { green, red, purple } from "@material-ui/core/colors";
import ParameterEditor from "./ParameterEditor";
import { Parameter } from "../containers/QueryRunner";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import NavigateBeforeIcon from "@material-ui/icons/NavigateBefore";
import Typography from "@material-ui/core/Typography";
import SVGIcon from "./SVGIcon";
import Tooltip from "./Tooltip";
import { updateArrayElement } from "../util";
import ProcessIconButton from "./ProcessIconButton";

const useStyles = makeStyles((theme: any) =>
  createStyles({
    modal: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    headerContainer: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      display: "flex",
      flexDirection: "column",
      height: "80vh",
      width: "80vw",
    },
    tabContainer: {
      flex: 1,
      backgroundColor: "#fafafa",
    },
    toolbarContainer: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      height: 48,
    },
    button: {
      marginRight: 10,
    },
    paramNavButton: {
      marginLeft: "auto",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    },
  })
);

export interface QueryParameterModalPropsType {
  open: boolean;
  cartesian: boolean;
  sync: boolean;
  statements: Array<string>;
  parameters: Array<Array<Parameter>>;
  onClose: any;
  onCartesianChange: any;
  onCopyParams: any;
  onSyncChange: any;
  onEditorBlur: any;
}

const QueryParameterModal = React.memo(
  (props: QueryParameterModalPropsType) => {
    const {
      open,
      statements,
      parameters,
      cartesian,
      sync,
      onCopyParams,
      onClose,
      onCartesianChange,
      onSyncChange,
      onEditorBlur,
    } = props;
    const classes = useStyles();
    const [curTab, setCurTab] = React.useState(0);
    const [curParam, setCurParam] = React.useState(0);
    const [total, setTotal] = React.useState(0);

    const statement = (statements && statements[curTab]) || "";
    const parameter = (parameters && parameters[curTab]) || [];

    const ableSync = React.useMemo(() => {
      const oraParams = (parameters && parameters[0]) || [];
      const pgParams = (parameters && parameters[1]) || [];

      return oraParams.length === pgParams.length;
    }, [parameters]);

    React.useEffect(() => {
      setCurTab(0);
      setCurParam(0);
    }, [open]);

    React.useEffect(() => {
      let combination = 0;
      if (cartesian) {
        combination = parameters[curTab].reduce((agg: number, curP) => {
          const curCount = curP.evaluated.value && curP.evaluated.value.length;
          if (!curCount) {
            return 0;
          }

          return curCount * agg;
        }, 1);
      } else {
        combination = parameters[curTab].reduce((agg: number, curP) => {
          const curCount = curP.evaluated.value && curP.evaluated.value.length;
          if (!curCount || agg === 0) {
            return 0;
          }

          return Math.max(agg, curCount);
        }, 1);
      }

      setTotal(combination);
    }, [parameters, curTab, cartesian]);

    const handleEditorBlur = React.useCallback(
      async (paramUpdate: any) => {
        if (!paramUpdate) {
          return;
        }

        let params;

        if (sync) {
          const newOraParams = updateArrayElement(
            parameters[0],
            curParam,
            Object.assign({}, parameters[0][curParam], paramUpdate)
          );
          const newPgParams = updateArrayElement(
            parameters[1],
            curParam,
            Object.assign({}, parameters[1][curParam], paramUpdate)
          );
          params = [newOraParams, newPgParams];
        } else {
          if (paramUpdate.raw === parameters[curTab][curParam].raw) {
            return;
          }
          const curParams = updateArrayElement(
            parameters[curTab],
            curParam,
            Object.assign({}, parameters[curTab][curParam], paramUpdate)
          );
          params = updateArrayElement(parameters, curTab, curParams);
        }

        await onEditorBlur(params, curTab, curParam);
      },
      [curParam, curTab, parameters, sync, onEditorBlur]
    );

    const handleChangeTab = React.useCallback((e: any, val: number) => {
      setCurTab(val);
    }, []);

    const handleClickPrev = React.useCallback(() => {
      if (parameter.length === 0) {
        setCurParam(0);
        return;
      }

      const preVal = curParam === 0 ? parameter.length - 1 : curParam - 1;
      setCurParam(preVal);
    }, [parameter, curParam]);

    const handleClickNext = React.useCallback(() => {
      if (parameter.length === 0) {
        setCurParam(0);
        return;
      }

      const nextVal = curParam >= parameter.length - 1 ? 0 : curParam + 1;
      setCurParam(nextVal);
    }, [parameter, curParam]);

    const handleCurrentParameterChange = React.useCallback((index: number) => {
      setCurParam(index);
    }, []);

    const handleCopyParameter = React.useCallback(async () => {
      const rawVal = parameters[curTab][curParam].raw;
      if (sync) {
        const newParameters = parameters.map((tabParam) =>
          tabParam.map((param) =>
            Object.assign({}, param, {
              raw: rawVal,
              evaluated: {},
            })
          )
        );
        await onCopyParams(newParameters);
      } else {
        const newCurParams = parameters[curTab].map((param) =>
          Object.assign({}, param, { raw: rawVal, evaluated: {} })
        );
        await onCopyParams(
          updateArrayElement(parameters, curTab, newCurParams)
        );
      }
    }, [curParam, curTab, onCopyParams, parameters, sync]);

    return (
      <div>
        <Modal className={classes.modal} open={open} onClose={() => {}}>
          <Paper className={classes.container}>
            <div className={classes.headerContainer}>
              <Tabs
                className={classes.tabContainer}
                value={curTab}
                onChange={handleChangeTab}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="Oracle" />
                <Tab label="Postgres" />
              </Tabs>
              <Typography
                className={classes.button}
                style={{ color: total === 0 ? red[500] : green[500] }}
              >
                {`Total ${total} combination`}
              </Typography>

              <Button
                className={classes.button}
                variant="contained"
                color="primary"
                disabled={total === 0}
                onClick={() => onClose(true)}
              >
                Run
              </Button>
              <Button
                className={classes.button}
                variant="outlined"
                color="secondary"
                onClick={() => onClose(false)}
              >
                Cancel
              </Button>
            </div>
            <Divider />
            <div className={classes.toolbarContainer}>
              {ableSync && (
                <FormControlLabel
                  style={{ marginLeft: 20 }}
                  control={
                    <Switch
                      checked={sync}
                      onChange={onSyncChange}
                      value="sync"
                    />
                  }
                  label="Sync"
                />
              )}

              <FormControlLabel
                style={{ marginLeft: 20 }}
                control={
                  <Switch
                    checked={cartesian}
                    onChange={onCartesianChange}
                    value="cartesian"
                  />
                }
                label="Cartesian"
              />

              {parameter.length > 0 && (
                <div className={classes.paramNavButton}>
                  <ProcessIconButton
                    title="Copy to all parameters"
                    onClick={handleCopyParameter}
                  >
                    <SVGIcon name="fileCopyFill" fill={purple[500]} />
                  </ProcessIconButton>

                  <Tooltip title="Previous parameter">
                    <IconButton onClick={handleClickPrev}>
                      <NavigateBeforeIcon color="action" />
                    </IconButton>
                  </Tooltip>
                  <Typography style={{ width: 60, textAlign: "center" }}>
                    {`${parameter.length === 0 ? 0 : curParam + 1} / ${
                      parameter.length
                    }`}
                  </Typography>
                  <Tooltip title="Next parameter">
                    <IconButton onClick={handleClickNext}>
                      <NavigateNextIcon color="action" />
                    </IconButton>
                  </Tooltip>
                </div>
              )}
            </div>
            <Divider />
            <ParameterEditor
              statement={statement}
              parameter={parameter}
              currentParameter={curParam}
              onEditorBlur={handleEditorBlur}
              onCurrentParameterChange={handleCurrentParameterChange}
            />
          </Paper>
        </Modal>
      </div>
    );
  }
);

export default QueryParameterModal;
