import React, { useContext } from "react";
import ClassSelect from "../../components/ClassSelect";
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
