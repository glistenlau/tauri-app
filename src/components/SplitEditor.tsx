import { Divider } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { editor } from "monaco-editor";
import React, {
  forwardRef,
  ForwardRefRenderFunction,
  useCallback
} from "react";
import { SizeMe, SizeMeProps } from "react-sizeme";
import { getEffectiveValueFromEditor } from "../util/monaco";
import DiffEditor from "./DiffEditor";
import Editor from "./Editor";
import "./SplitEditor.css";

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

export interface SplitEditorHandle {
  getEffectiveValue(): [string, string];
}

interface SplitEditorProps {
  baseValues?: [string, string];
  defaultValues?: [string, string];
  valuePair?: [string, string];
  onChange?: (valuePair: [string, string]) => void;
  onBlur?: () => void;
  onEditorRef?: Function;
  diff: boolean;
  mode?: "sql" | "xml";
  activePair?: [boolean, boolean];
}

const SplitEditor: ForwardRefRenderFunction<
  SplitEditorHandle,
  SplitEditorProps
> = (
  {
    baseValues,
    defaultValues,
    onBlur,
    diff,
    onEditorRef,
    mode,
    activePair,
    valuePair,
    onChange,
  }: SplitEditorProps,
  ref
) => {
    const classes = styles();
    const refOne = React.useRef(null as any);
    const refTwo = React.useRef(null as any);
    const refDiff = React.useRef(null as { editor: editor.ICodeEditor } | null);

    const getDiffEditorPair = React.useCallback(() => {
      let editorOne;
      let editorTwo;
      if (diff) {
        const diffRefEditor: any = refDiff?.current?.editor;
        editorOne = diffRefEditor?.getOriginalEditor();
        editorTwo = diffRefEditor?.getModifiedEditor();
      }

      return [editorOne, editorTwo];
    }, [diff]);

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

    const getWidth = useCallback(
      (size) => {
        if (!activePair || activePair.reduce((pre, cur) => pre && cur)) {
          return `${Math.floor((size.width - 1) / 2)}px`;
        } else {
          return size.width;
        }
      },
      [activePair]
    );

    const getWidthPair = useCallback(
      (size) => {
        const width = getWidth(size);
        if (!activePair) {
          return [width, width];
        }
        return activePair.map((active) => (active ? width : 0));
      },
      [activePair, getWidth]
    );

  React.useImperativeHandle(ref, () => ({
      getEffectiveValue: () => {
        let valuePair: [string, string] = ['', ''];
        if (diff) {
          valuePair = getDiffEditorPair().map(getEffectiveValueFromEditor).map(ev => ev ?? "") as [
            string,
            string
          ];
        } else {
          valuePair = [
            refOne.current?.getEffectiveValue() || "",
            refTwo.current?.getEffectiveValue() || "",
          ];
        }

        if (!valuePair[1]) {
          valuePair[1] = valuePair[0];
        }

        return valuePair;
      },
    }));

    const splitEditorRenderer = useCallback(
      ({ size }: { size: SizeMeProps["size"] }) => {
        const widthPair = getWidthPair(size);
        return (
          <div className={classes.container}>
            <Editor
              ref={handleOraRef}
              value={(valuePair && valuePair[0]) ?? ""}
              defaultValue={defaultValues && defaultValues[0]}
              key="oracleEditor"
              width={widthPair[0]}
              height={!activePair || activePair[0] ? size.height || undefined : 0}
              language={mode || "sql"}
              onBlur={onBlur}
              onChange={handleLeftChange}
            />
            {(!activePair || (activePair[0] && activePair[1])) && (
              <Divider orientation="vertical" flexItem />
            )}
            <Editor
              ref={handlePgRef}
              value={(valuePair && valuePair[1]) ?? ""}
              defaultValue={defaultValues && defaultValues[1]}
              key="postgresEditor"
              width={widthPair[1]}
              height={!activePair || activePair[1] ? size.height || undefined : 0}
              language={mode || "sql"}
              onBlur={onBlur}
              onChange={handleRightChange}
            />
          </div>
        );
      },
      [
        activePair,
        classes.container,
        defaultValues,
        getWidthPair,
        handleLeftChange,
        handleOraRef,
        handlePgRef,
        handleRightChange,
        mode,
        onBlur,
        valuePair,
      ]
    );

    const diffEditorRenderer = useCallback(
      ({ size }: { size: SizeMeProps["size"] }) => (
        <div className={classes.container}>
          <DiffEditor
            original={valuePair && valuePair[0]}
            value={valuePair && valuePair[1]}
            onChange={handleRightChange}
            ref={handleDiffRef}
            width={size.width || undefined}
            height={size.height || undefined}
            language={mode || "sql"}
          />
        </div>
      ),
      [classes.container, handleDiffRef, handleRightChange, mode, valuePair]
    );

    if (diff) {
      return (
        <SizeMe monitorHeight monitorWidth>
          {diffEditorRenderer}
        </SizeMe>
      );
    }

    return (
      <SizeMe monitorHeight monitorWidth>
        {splitEditorRenderer}
      </SizeMe>
    );
  };

export default React.memo(forwardRef(SplitEditor));
