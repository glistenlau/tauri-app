import React, { useCallback, useContext } from "react";
import PropNameList from "../../components/PropNameList";
import { useSelectPropKeyMutation } from "../../generated/graphql";
import { PropsListContext } from "./PropsListView";

const ClassSelectView = React.memo(() => {

  const { propKeyList, selectedClass, selectedPropKey, setSelectedPropKey, setPropValues } = useContext(PropsListContext);
  const [selectPropKey] = useSelectPropKeyMutation();
  const handleClickPropName = useCallback(
    async (propName: string) => {
      setSelectedPropKey(propName);
      const { data } = await selectPropKey({ variables: { className: selectedClass, propKey: propName } });
      if (!data) {
        return;
      }
      const { propVals } = data.selectPropKey;
      setPropValues((propVals as [string, string] | undefined) || ["", ""]);
    },
    [selectPropKey, selectedClass, setPropValues, setSelectedPropKey]
  );

  return (
    <PropNameList
      propNameList={propKeyList}
      selectedProp={selectedPropKey}
      onListItemClick={handleClickPropName}
    />
  );
});

export default ClassSelectView;
