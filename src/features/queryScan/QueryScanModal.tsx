import React from "react";
import { useSelector } from "react-redux";
import QueryParameterModal from "../../components/QueryParameterModal";
import { RootState } from "../../reducers";

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

  return (
    <QueryParameterModal
      cartesian={cartesian}
      sync={sync}
      open={openModel}
      statements={statements}
      parameters={parameters}
      onClose={() => {}}
      onCartesianChange={() => {}}
      onSyncChange={() => {}}
      onEditorBlur={() => {}}
      onCopyParams={() => {}}
    />
  );
};

export default QueryScanModal;
