import React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditor, { MonacoEditorProps } from "react-monaco-editor";
import { useSelector } from "react-redux";
import { RootState } from "../reducers";

export const themeList: string[] = [];
const themeDataMap: any = require("monaco-themes/themes/themelist.json");
Object.keys(themeDataMap).forEach((themeName) => {
  const themeFileName = themeDataMap[themeName];
  const themeData = require(`monaco-themes/themes/${themeFileName}.json`);
  monaco.editor.defineTheme(themeName, themeData);
  themeList.push(themeName);
});

interface EditorProps extends MonacoEditorProps {
  decorations?: monaco.editor.IModelDeltaDecoration[];
}

const Editor = React.forwardRef(
  ({ decorations, options, ...otherProps }: EditorProps, ref: any) => {
    const innerRef = React.useRef(null);
    const oldDecorations = React.useRef([]);
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

      oldDecorations.current = innerRef.current.editor.deltaDecorations(
        oldDecorations.current,
        decorations
      );
    }, [decorations]);

    return (
      <MonacoEditor
        ref={handleRef}
        theme={theme}
        options={effectiveOptions}
        {...otherProps}
      />
    );
  }
);

export default React.memo(Editor);
