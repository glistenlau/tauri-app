import React, { useCallback, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClassSelect from "../../components/ClassSelect";
import { useSelectClassMutation } from "../../generated/graphql";
import { RootState } from "../../reducers";
import { setClassPath } from "./propsEditorSlice";
import { PropsListContext } from "./PropsListView";

const ClassSelectView = React.memo(() => {
  const { classList, selectedClass, selectClass } =
    useContext(PropsListContext);

  return (
    <ClassSelect
      onChange={selectClass}
      selected={selectedClass}
      values={classList}
    />
  );
});

export default ClassSelectView;
