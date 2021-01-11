import { editor } from "monaco-editor";

export const getEffectiveValueFromEditor = (monaco?: editor.ICodeEditor) => {
  if (!monaco) {
    return "";
  }

  let value = "";

  // tried to get the selected values
  const selections = monaco.getSelections();
  if (selections !== null) {
    value = selections
      .map((s: any) => monaco.getModel()?.getValueInRange(s) || "")
      .join(" ");
  }

  if (!value) {
    // no selected values, then get the whole value
    value = monaco.getModel()?.getValue() || "";
  }

  return value;
};

export const getValueFromEditor = (monaco?: editor.ICodeEditor) => {
  if (!monaco) {
    return "";
  }

  return monaco.getModel()?.getValue() || "";
};
