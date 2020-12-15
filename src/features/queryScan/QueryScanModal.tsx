import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import QueryParameterModal from "../../components/QueryParameterModal";
import { RootState } from "../../reducers";
import { setOpenModal } from "./queryScanSlice";

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
    (state: RootState) => state.queryScan.parameters
  );

  const dispatch = useDispatch();

  const handleModalClose = useCallback(() => {
    dispatch(setOpenModal(false));
  }, [dispatch]);

  const handleClickScan = useCallback(() => {
    dispatch(startScan());
  }, []);

  console.log("open modal", openModel);

  return (
    <QueryParameterModal
      cartesian={cartesian}
      sync={sync}
      open={openModel}
      statements={statements}
      parameters={parameters}
      onClose={handleModalClose}
      onClickScan={handleClickScan}
      onCartesianChange={() => {}}
      onSyncChange={() => {}}
      onEditorBlur={() => {}}
      onCopyParams={() => {}}
    />
  );
};

export default QueryScanModal;
