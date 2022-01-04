import React, { useContext } from "react";
import PropNameList from "../../components/PropNameList";
import { PropsListContext } from "./PropsListView";

const ClassSelectView = React.memo(() => {
  const { propKeyList, selectedPropKey, selectPropKey } =
    useContext(PropsListContext);

  return (
    <PropNameList
      propNameList={propKeyList}
      selectedProp={selectedPropKey}
      onListItemClick={selectPropKey}
    />
  );
});

export default ClassSelectView;
