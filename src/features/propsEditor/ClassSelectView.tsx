import React, { useCallback, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClassSelect from "../../components/ClassSelect";
import { useSelectClassMutation } from "../../generated/graphql";
import { RootState } from "../../reducers";
import { setClassPath } from "./propsEditorSlice";
import { PropsListContext } from "./PropsListView";

const ClassSelectView = React.memo(() => {
  const [selectClass] = useSelectClassMutation();

  const { classList, selectedClass, setPropKeyList, setPropValues, setSelectedClass, setSelectedPropKey } = useContext(PropsListContext);

  const handleChange = useCallback(
    async (path: string) => {
      setSelectedClass(path);
      const { data } = await selectClass({ variables: { className: path } });
      if (!data) {
        return;
      }
      const { propKeyList, propVals } = data.selectClass;
      const selectedPropKey = propKeyList == null || propKeyList.length === 0 ? "" : propKeyList[0].name;
      setPropKeyList(propKeyList || []);
      setSelectedPropKey(selectedPropKey);
      setPropValues(propVals || ["", ""]);
    },
    [selectClass, setPropKeyList, setPropValues, setSelectedClass, setSelectedPropKey]
  );

  return (
    <ClassSelect
      onChange={handleChange}
      selected={selectedClass}
      values={classList}
    />
  );
});

export default ClassSelectView;
