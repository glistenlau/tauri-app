import { editor } from "monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, {
  ForwardRefRenderFunction,
  MutableRefObject,
  useImperativeHandle,
} from "react";
import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import { useSelector } from "react-redux";
import { RootState } from "../reducers";
import { getEffectiveValueFromEditor } from "../util/monaco";

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
  editor?: editor.ICodeEditor;
}

export interface EditorProps extends MonacoEditorProps {
  decorations?: monaco.editor.IModelDeltaDecoration[];
  onBlur?: () => void;
}

const Editor: ForwardRefRenderFunction<EditorHandle, EditorProps> = (
  { decorations, onBlur, options, ...otherProps }: EditorProps,
  ref
) => {
  const innerRef: MutableRefObject<null | MonacoEditor> = React.useRef(null);
  const oldDecorations = React.useRef([] as string[]);
  const theme = useSelector((state: RootState) => state.editorSettings.theme);
  const fontSize = useSelector(
    (state: RootState) => state.editorSettings.fontSize
  );

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

  const handleRef = React.useCallback(
    (e) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(e);
        } else {
          ref.current = e;
        }
      }
      innerRef.current = e;
    },
    [ref]
  );

  React.useEffect(() => {
    if (!decorations || !innerRef.current) {
      return;
    }

    oldDecorations.current =
      innerRef.current?.editor?.deltaDecorations(
        oldDecorations.current,
        decorations
      ) || [];
  }, [decorations]);

  useImperativeHandle(
    ref,
    () => ({
      editor: innerRef.current?.editor,
      getEffectiveValue: () =>
        getEffectiveValueFromEditor(innerRef.current?.editor),
    }),
    []
  );

  React.useEffect(() => {
    if (!onBlur) {
      return;
    }

    const disposible = innerRef.current?.editor?.onDidBlurEditorWidget(onBlur);

    return () => {
      disposible?.dispose();
    };
  }, [onBlur]);

  return (
    <MonacoEditor
      ref={handleRef}
      theme={theme}
      options={effectiveOptions}
      {...otherProps}
    />
  );
};

export default React.memo(React.forwardRef(Editor));
