import React from "react";
import { withSize, SizeMeProps } from "react-sizeme";
import { makeStyles } from "@material-ui/core/styles";
import "./SplitEditor.css";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Divider } from "@material-ui/core";
import DiffEditor from "./DiffEditor";
import Editor from "./Editor";

const styles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    height: "10%",
    width: "100%",
  },
  editor: {
    flex: 1,
  },
}));

interface SplitEditorProps {
  baseValues?: [string, string];
  defaultValues?: [string, string];
  valuePair?: [string, string];
  onChange?: (valuePair: [string, string]) => void;
  onBlur?: (valuePair: [string, string]) => void;
  onEditorRef?: Function;
  diff: boolean;
  mode?: "sql" | "xml";
  size: SizeMeProps["size"];
  activePair?: [boolean, boolean];
}

const SplitEditor = ({
  baseValues,
  defaultValues,
  onBlur,
  diff,
  size,
  onEditorRef,
  mode,
  activePair,
  valuePair,
  onChange,
}: SplitEditorProps) => {
  const classes = styles();
  const refOne = React.useRef();
  const refTwo = React.useRef();
  const refDiff = React.useRef();

  const getCurrentEditorPair = React.useCallback(() => {
    let editorOne;
    let editorTwo;
    if (diff) {
      const diffRefEditor: any = refDiff?.current?.editor;
      editorOne = diffRefEditor?.getOriginalEditor();
      editorTwo = diffRefEditor?.getModifiedEditor();
    } else {
      editorOne = refOne?.current?.editor;
      editorTwo = refTwo?.current?.editor;
    }
    return [editorOne, editorTwo];
  }, [diff]);

  React.useEffect(() => {
    if (!baseValues) {
      return;
    }

    const [editorOne, editorTwo] = getCurrentEditorPair();

    if (editorOne && editorOne.getValue() !== baseValues[0]) {
      editorOne.setValue(baseValues[0]);
      editorOne.setScrollTop(0);
      editorOne.setPosition(new monaco.Position(1, 1));
    }
    if (editorTwo && editorTwo.getValue() !== baseValues[1]) {
      editorTwo.setValue(baseValues[1]);
      editorTwo.setScrollTop(0);
      editorTwo.setPosition(new monaco.Position(1, 1));
    }
  }, [baseValues, getCurrentEditorPair]);

  const handleBlur = React.useCallback(() => {
    if (!onBlur) {
      return;
    }

    if (diff && !refDiff.current) {
      return;
    }

    if (!diff && (!refOne || !refTwo)) {
      return;
    }

    const [editorOne, editorTwo] = getCurrentEditorPair();

    const valueOne = (editorOne && editorOne.getValue()) || "";
    const valueTwo = (editorTwo && editorTwo.getValue()) || "";

    onBlur([valueOne, valueTwo]);
  }, [onBlur, diff, getCurrentEditorPair]);

  const handleBeforeUnload = React.useCallback(() => {
    handleBlur();
  }, [handleBlur]);

  React.useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    const [editorOne, editorTwo] = getCurrentEditorPair();
    const disposibleOne =
      editorOne && editorOne.onDidBlurEditorWidget(handleBlur);
    const disposibleTwo =
      editorTwo && editorTwo.onDidBlurEditorWidget(handleBlur);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      disposibleOne && disposibleOne.dispose();
      disposibleTwo && disposibleTwo.dispose();
    };
  }, [handleBlur, handleBeforeUnload, getCurrentEditorPair]);

  const handleDiffRef = React.useCallback(
    (e) => {
      refDiff.current = e;
      onEditorRef && onEditorRef(e && e.editor.getOriginalEditor(), 0);
      onEditorRef && onEditorRef(e && e.editor.getModifiedEditor(), 1);
    },
    [onEditorRef]
  );

  const handleOraRef = React.useCallback(
    (e) => {
      onEditorRef && onEditorRef(e && e.editor, 0);
      refOne.current = e;
    },
    [onEditorRef]
  );

  const handlePgRef = React.useCallback(
    (e) => {
      onEditorRef && onEditorRef(e && e.editor, 1);
      refTwo.current = e;
    },
    [onEditorRef]
  );

  const handleLeftChange = React.useCallback(
    (val: string) => {
      if (!onChange) {
        return;
      }
      const rightValue = (valuePair && valuePair[1]) || "";
      onChange([val, rightValue]);
    },
    [onChange, valuePair]
  );

  const handleRightChange = React.useCallback(
    (val: string) => {
      if (!onChange) {
        return;
      }
      const leftValue = (valuePair && valuePair[0]) || "";
      onChange([leftValue, val]);
    },
    [onChange, valuePair]
  );

  const width = React.useMemo(() => {
    if (!activePair || activePair.reduce((pre, cur) => pre && cur)) {
      return `${Math.floor((size.width - 1) / 2)}px`;
    } else {
      return size.width;
    }
  }, [size.width, activePair]);

  const widthPair = React.useMemo(() => {
    if (!activePair) {
      return [width, width];
    }
    return activePair.map((active) => (active ? width : 0));
  }, [activePair, width]);

  if (diff) {
    return (
      <div className={classes.container}>
        <DiffEditor
          original={valuePair && valuePair[0]}
          value={valuePair && valuePair[1]}
          onChange={handleRightChange}
          ref={handleDiffRef}
          width={size.width}
          height={size.height}
          language={mode || "sql"}
        />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <Editor
        ref={handleOraRef}
        value={valuePair && valuePair[0]}
        defaultValue={defaultValues && defaultValues[0]}
        key="oracleEditor"
        width={widthPair[0]}
        height={!activePair || activePair[0] ? size.height : 0}
        language={mode || "sql"}
        onChange={handleLeftChange}
      />
      {(!activePair || (activePair[0] && activePair[1])) && (
        <Divider orientation="vertical" flexItem />
      )}
      <Editor
        ref={handlePgRef}
        value={valuePair && valuePair[1]}
        defaultValue={defaultValues && defaultValues[1]}
        key="postgresEditor"
        width={widthPair[1]}
        height={!activePair || activePair[1] ? size.height : 0}
        language={mode || "sql"}
        onChange={handleRightChange}
      />
    </div>
  );
};

export default React.memo(
  withSize({ monitorHeight: true, monitorWidth: true })(SplitEditor)
);
