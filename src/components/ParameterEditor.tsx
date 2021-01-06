import { Divider } from "@material-ui/core";
import { red } from "@material-ui/core/colors";
import Typography from "@material-ui/core/Typography";
import { createStyles, makeStyles } from "@material-ui/styles";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { withSize } from "react-sizeme";
import { Parameter, ParameterValue } from "../features/queryScan/queryScanSlice";
import Editor, { EditorHandle } from "./Editor";
import "./SplitEditor.css";

const useStyles = makeStyles((theme: any) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "row",
      height: "50%",
      width: "100%",
      flex: 1,
    },
    leftContainer: {
      height: "100%",
      width: "50%",
      flex: 1,
    },
    evalPanel: {
      flex: 1,
      height: "10%",
      width: "100%",
      overflow: "scroll",
      backgroundColor: theme.palette.background.default,
    },
    editor: {
      flex: 1,
    },
    rightContainer: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "50%",
      flex: 1,
    },
  })
);

interface ParameterEditorPropsType {
  size: any;
  statement: string;
  parameter: Array<Parameter>;
  currentParameter: number;
  onEditorBlur: (paramVal: ParameterValue) => void;
  onCurrentParameterChange: any;
}

const ParameterEditor = (props: ParameterEditorPropsType) => {
  const {
    size,
    statement,
    parameter,
    onEditorBlur,
    currentParameter,
    onCurrentParameterChange,
  } = props;
  const [markers, setMarkers]: [any, any] = useState([]);
  const editorRef: null | RefObject<EditorHandle> = useRef(null);
  const rightEditorRef: null | RefObject<EditorHandle> = useRef(null);

  const handleBlur = React.useCallback(() => {
    if (!rightEditorRef.current || !onEditorBlur) {
      return;
    }

    const { editor } = rightEditorRef.current;
    if (!editor) {
      return;
    }

    onEditorBlur({
      raw: editor.getValue(),
    });
  }, [onEditorBlur]);

  const handleEditorClick = useCallback((e: monaco.editor.IEditorMouseEvent) => {
    e.event.preventDefault();
    const { position } = e.target;
    if (!position) {
      return;
    }
    const { column, lineNumber } = position;
    const index = parameter.findIndex(param => param.row === lineNumber && (param.col === column || param.col + 1 === column));
    if (index !== -1) {
      onCurrentParameterChange(index);
    }
  }, [onCurrentParameterChange, parameter]);

  useEffect(() => {
    const editor = editorRef.current && editorRef.current.editor;
    if (editor) {
      const disposable = editor.onMouseDown(handleEditorClick);
      return () => {
        disposable.dispose();
      };
    }
  }, [handleEditorClick]);

  useEffect(() => {
    if (!parameter || !parameter[currentParameter] || !rightEditorRef.current) {
      return;
    }

    const rawVal = parameter[currentParameter].raw;
    const { editor } = rightEditorRef.current;

    if (editor && editor.getValue() !== rawVal) {
      editor.setValue(rawVal);
      editor.setScrollTop(0);
      editor.setPosition(new monaco.Position(1, 1));
    }
  }, [currentParameter, parameter]);

  useEffect(() => {
    let activeRow: number = 0;
    let activeColumn: number = 0;
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = parameter.map(
      (p: Parameter, i) => {
        let className = "clickableErrorMarker";

        if (
          p.evaluated?.success &&
          p.evaluated?.value?.length > 0
        ) {
          className = "clickableValidMarker";
        }
        if (i === currentParameter) {
          className = "clickableActiveMarker";
          activeRow = p.row;
          activeColumn = p.col;
        }

        return {
          range: new monaco.Range(p.row, p.col, p.row, p.col + 1),
          options: {
            inlineClassName: className,
          },
        };
      }
    );

    const lineDecoration: monaco.editor.IModelDeltaDecoration = {
      range: new monaco.Range(activeRow, 0, activeRow, 1),
      options: { className: "hightlightLine", isWholeLine: true, zIndex: -20 },
    };

    newDecorations.push(lineDecoration);

    setMarkers(newDecorations);
    if (editorRef.current?.editor) {
      editorRef.current.editor.revealPositionInCenter(
        new monaco.Position(activeRow, activeColumn)
      );
    }
  }, [parameter, currentParameter]);

  const classes = useStyles();

  const width = React.useMemo(() => `${Math.floor(size.width / 2)}px`, [
    size.width,
  ]);
  const height = React.useMemo(() => `${Math.floor(size.height / 2)}px`, [
    size.height,
  ]);

  const evalVal = React.useMemo(() => parameter[currentParameter]?.evaluated, [
    parameter,
    currentParameter
  ]);

  const evalValStr = React.useMemo(() => {
    if (!evalVal?.success) {
      return '';
    }

    return JSON.stringify(evalVal.value);
  }, [evalVal]);

  return (
    <div className={classes.container}>
      <Editor
        ref={editorRef}
        options={{ readOnly: true, renderLineHighlight: "none" }}
        language="sql"
        height={size.height}
        width={width}
        value={statement}
        decorations={markers}
      />
      <Divider orientation="vertical" flexItem />
      <div className={classes.rightContainer}>
        <Editor
          ref={rightEditorRef}
          language="javascript"
          height={height}
          width={width}
          onBlur={handleBlur}
        />
        <Divider />

        <div className={classes.evalPanel}>
          {evalVal?.success && (
            <Typography
              style={{
                whiteSpace: "pre-line",
                padding: 10,
                wordBreak: "break-all",
              }}
            >
              {evalValStr}
            </Typography>
          )}
          {(evalVal && !evalVal.success) && (
            <Typography
              style={{
                whiteSpace: "pre-line",
                padding: 10,
                color: red[500],
                wordBreak: "break-all",
              }}
            >
              {evalVal.errorMessage}
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
};

export default withSize({ monitorHeight: true, monitorWidth: true })(
  ParameterEditor
);
