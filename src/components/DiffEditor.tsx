import {
  DiffEditor as MonacoDiffEditor,
  DiffEditorProps as MonacoDiffEditorProps,
  DiffOnMount,
} from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../reducers";

const DiffEditor = React.forwardRef<
  monaco.editor.IDiffEditor,
  MonacoDiffEditorProps
>(({ options, ...otherProps }, ref) => {
  const theme = useSelector((state: RootState) => state.editorSettings.theme);
  const fontSize = useSelector(
    (state: RootState) => state.editorSettings.fontSize
  );

  const handleRef = React.useCallback(
    (e) => {
      if (ref) {
        if (typeof ref === "function") {
          ref(e);
        } else {
          ref.current = e;
        }
      }
    },
    [ref]
  );

  const handleDiffEditorMount: DiffOnMount = useCallback(
    (editor: monaco.editor.IDiffEditor, monaco) => {
      handleRef(editor);
    },
    [handleRef]
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

  return (
    <MonacoDiffEditor
      onMount={handleDiffEditorMount}
      theme={theme}
      options={effectiveOptions}
      {...otherProps}
    />
  );
});

export default React.memo(DiffEditor);
