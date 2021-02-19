// import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import MonacoEditor, {
  EditorProps as MonacoEditorProps,
  OnMount
} from "@monaco-editor/react";
import { editor } from "monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, {
  ForwardRefRenderFunction,
  useCallback,
  useImperativeHandle,
  useRef
} from "react";
import { useSelector } from "react-redux";
import { RootState } from "../reducers";
import {
  getEffectiveValueFromEditor,
  getValueFromEditor
} from "../util/monaco";

export const themeList: string[] = [];
const themeDataMap: any = require("monaco-themes/themes/themelist.json");
Object.keys(themeDataMap).forEach((themeName) => {
  const themeFileName = themeDataMap[themeName];
  const themeData = require(`monaco-themes/themes/${themeFileName}.json`);
  monaco.editor.defineTheme(themeName, themeData);
  themeList.push(themeName);
});

export interface EditorHandle {
  getEffectiveValue(): string;
  getValue(): string;
  editor?: editor.IStandaloneCodeEditor;
}

export interface EditorProps extends MonacoEditorProps {
  decorations?: monaco.editor.IModelDeltaDecoration[];
  onBlur?: () => void;
}

const Editor: ForwardRefRenderFunction<EditorHandle, EditorProps> = (
  { decorations, onBlur, options, ...otherProps }: EditorProps,
  ref
) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const oldDecorations = React.useRef([] as string[]);
  const theme = useSelector((state: RootState) => state.editorSettings.theme);
  const fontSize = useSelector(
    (state: RootState) => state.editorSettings.fontSize
  );

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
  }, []);

  const effectiveOptions = React.useMemo(() => {
    return Object.assign(
      {},
      {
        fontSize,
        minimap: {
          enabled: false,
        },
      },
      options
    );
  }, [fontSize, options]);

  React.useEffect(() => {
    if (!decorations || !editorRef.current) {
      return;
    }

    oldDecorations.current =
      editorRef.current?.deltaDecorations(
        oldDecorations.current,
        decorations
      ) || [];
  }, [decorations]);

  useImperativeHandle(
    ref,
    () => ({
      editor: editorRef.current,
      getEffectiveValue: () => getEffectiveValueFromEditor(editorRef.current),
      getValue: () => getValueFromEditor(editorRef.current),
    }),
    []
  );

  React.useEffect(() => {
    if (!onBlur) {
      return;
    }

    const disposible = editorRef.current?.onDidBlurEditorWidget(onBlur);

    return () => {
      disposible?.dispose();
    };
  }, [onBlur]);

  return (
    <MonacoEditor
      theme={theme}
      options={effectiveOptions}
      onMount={handleEditorDidMount}
      {...otherProps}
    />
  );
};

export default React.memo(React.forwardRef(Editor));
