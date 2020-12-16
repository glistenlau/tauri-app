import {
  Button,
  DialogActions,
  Divider,
  FormControlLabel,
  IconButton,
  Switch
} from "@material-ui/core";
import { green, purple, red } from "@material-ui/core/colors";
import Dialog from "@material-ui/core/Dialog/Dialog";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Typography from "@material-ui/core/Typography";
import NavigateBeforeIcon from "@material-ui/icons/NavigateBefore";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import { createStyles, makeStyles } from "@material-ui/styles";
import React, { useCallback } from "react";
import styled from "styled-components";
import { Parameter } from "../features/queryScan/queryScanSlice";
import SchemaSelect from "../features/queryScan/SchemaSelect";
import { updateArrayElement } from "../util";
import ParameterEditor from "./ParameterEditor";
import ProcessIconButton from "./ProgressIconButton";
import SVGIcon from "./SVGIcon";
import Tooltip from "./Tooltip";

const TabLaberContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContentContainer = styled.div`
  height: 90vh;
  display: flex;
  flex-direction: column;
`;

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
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "column",
      height: "90vh",
      width: "90vw",
      padding: 5,
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
  statements: [string, string];
  parameters: [Parameter[], Parameter[]];
  onClose: any;
  onClickScan: () => void;
  onCartesianChange: any;
  onCopyParams: any;
  onSyncChange: any;
  onParametersPairChange: (
    paramsPair: [Parameter[], Parameter[]],
    pairIndex: number,
    paramIndex: number
  ) => Promise<void>;
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
      onClickScan,
      onClose,
      onCartesianChange,
      onSyncChange,
      onParametersPairChange,
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
          const curCount =
            curP.evaluated?.success && curP.evaluated?.value?.length;
          if (!curCount) {
            return 0;
          }

          return curCount * agg;
        }, 1);
      } else {
        combination = parameters[curTab].reduce((agg: number, curP) => {
          const curCount =
            curP.evaluated?.success && curP.evaluated?.value?.length;
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
        console.log('handle editor blur.', paramUpdate);
        if (!paramUpdate) {
          return;
        }

        let params: [Parameter[], Parameter[]];

        if (paramUpdate.raw === parameters[curTab][curParam].raw) {
          return;
        }

        if (sync) {
          const newParamsPair = parameters.map((params) =>
            updateArrayElement(
              params,
              curParam,
              Object.assign({}, params[curParam], paramUpdate)
            )
          );
          params = newParamsPair as [Parameter[], Parameter[]];
        } else {
          const curParams = updateArrayElement(
            parameters[curTab],
            curParam,
            Object.assign({}, parameters[curTab][curParam], paramUpdate)
          );
          params = updateArrayElement(parameters, curTab, curParams) as [
            Parameter[],
            Parameter[]
          ];
        }

        await onParametersPairChange(params, curTab, curParam);
      },
      [curParam, curTab, parameters, sync, onParametersPairChange]
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

    const tabLabel = useCallback((text) => {
      return (
        <TabLaberContainer>
          <SVGIcon
            style={{ flexShrink: 0, marginRight: 5 }}
            name={text === "Oracle" ? "database" : "postgres"}
            width={20}
            height={20}
          />
          <span>{text}</span>
        </TabLaberContainer>
      );
    }, []);
    console.log("open", open);

    return (
      <Dialog fullWidth maxWidth="xl" open={open}>
        <ContentContainer>
          <SchemaSelect />
          <div className={classes.headerContainer}>
            <Tabs
              className={classes.tabContainer}
              value={curTab}
              onChange={handleChangeTab}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label={tabLabel("Oracle")} />
              <Tab label={tabLabel("Postgres")} />
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
                  <Switch checked={sync} onChange={onSyncChange} value="sync" />
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
          <Divider />

          <DialogActions>
            <Button autoFocus onClick={onClose} color="primary">
              Cancel
            </Button>
            <Button onClick={onClickScan} color="primary">
              Scan
            </Button>
          </DialogActions>
        </ContentContainer>
      </Dialog>
    );
  }
);

export default QueryParameterModal;
