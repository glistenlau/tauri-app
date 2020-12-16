import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import QueryParameterModal from "../../components/QueryParameterModal";
import { evaluateParamPair } from "../../core/parameterEvaluator";
import { RootState } from "../../reducers";
import { updateArrayElement } from "../../util";
import { Parameter, setOpenModal, setParametersPair } from "./queryScanSlice";

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

  const parameters = useSelector(
    (state: RootState) => state.queryScan.parametersPair
  );

  const activeSchema = useSelector(
    (state: RootState) => state.queryScan.activeSchema
  );


  const dispatch = useDispatch();

  const handleModalClose = useCallback(() => {
    dispatch(setOpenModal(false));
  }, [dispatch]);

  const handleClickScan = useCallback(() => {}, []);

  const handleParametersPairChange = useCallback(
    async (
      paramsPair: [Parameter[], Parameter[]],
      pairIndex: number,
      paramIndex: number
    ) => {
      console.log('Test')
      const evaled = await evaluateParamPair(
        [paramsPair[0][paramIndex], paramsPair[1][paramIndex]],
        activeSchema
      );
      
      const newParamsPair = paramsPair.map((params, index) => updateArrayElement(params, paramIndex, evaled[index]));

      dispatch(setParametersPair(newParamsPair as [Parameter[], Parameter[]]));
    },
    [activeSchema, dispatch]
  );

  return (
    <QueryParameterModal
      cartesian={cartesian}
      sync={sync}
      open={openModel}
      statements={statements}
      parameters={parameters || [[], []]}
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
