import React, { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import QueryParameterModal from "../../components/QueryParameterModal";
import { evaluateRawParamsPair } from "../../core/parameterEvaluator";
import { useIsMounted } from "../../hooks/useIsMounted";
import { RootState } from "../../reducers";
import {
  Parameter,
  setOpenModal,
  setParametersPair,
  startQueryScan
} from "./queryScanSlice";

const QueryScanModal: React.FC = () => {
  const cartesian = useSelector(
    (state: RootState) => state.queryScan.cartesian
  );
  const openModel = useSelector(
    (state: RootState) => state.queryScan.openModel
  );

  const sync = useSelector((state: RootState) => state.queryScan.sync);

  const statements = useSelector(
    (state: RootState) => state.queryScan.statements
  );

  const parametersPair = useSelector(
    (state: RootState) => state.queryScan.parametersPair
  );

  const activeSchema = useSelector(
    (state: RootState) => state.queryScan.activeSchema
  );

  const selectedSchemas = useSelector(
    (state: RootState) => state.queryScan.selectedSchemas
  );

  const isMounted = useIsMounted();

  const dispatch = useDispatch();

  const handleModalClose = useCallback(() => {
    dispatch(setOpenModal(false));
  }, [dispatch]);

  const handleClickScan = useCallback(async () => {
    await dispatch(startQueryScan());
  }, [dispatch]);

  const handleParametersPairChange = useCallback(
    async (
      paramsPair: [Parameter[], Parameter[]],
      pairIndex: number,
      paramIndex: number
    ) => {
      dispatch(setParametersPair(paramsPair));
    },
    [dispatch]
  );

  const evalRawParamsPair = useCallback(async () => {
    const evaledPair = await evaluateRawParamsPair(
      parametersPair,
      activeSchema
    );
    if (isMounted.current) {
      dispatch(setParametersPair(evaledPair as [Parameter[], Parameter[]]));
    }
  }, [activeSchema, dispatch, isMounted, parametersPair]);

  const scanDisabled = useMemo(() => {
    return (
      activeSchema == null ||
      parametersPair
        .map((params) =>
          params.every((param) => param.evaluated?.success === true)
        )
        .reduce((pre, cur) => !pre && !cur, true)
    );
  }, [activeSchema, parametersPair]);

  useEffect(() => {
    evalRawParamsPair();
  }, [evalRawParamsPair]);

  return (
    <QueryParameterModal
      cartesian={cartesian}
      scanDisabled={scanDisabled}
      sync={sync}
      open={openModel}
      statements={statements}
      parameters={parametersPair || [[], []]}
      onClose={handleModalClose}
      onClickScan={handleClickScan}
      onCartesianChange={() => {}}
      onSyncChange={() => {}}
      onParametersPairChange={handleParametersPairChange}
      onCopyParams={() => {}}
    />
  );
};

export default QueryScanModal;
