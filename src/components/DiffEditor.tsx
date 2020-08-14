import React from "react";
import { MonacoDiffEditor, MonacoDiffEditorProps } from "react-monaco-editor";
import { useSelector } from "react-redux";
import { RootState } from "../reducers";

const DiffEditor = React.forwardRef(
  ({ options, ...otherProps }: MonacoDiffEditorProps, ref: any) => {
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

    return (
      <MonacoDiffEditor
        ref={ref}
        theme={theme}
        options={effectiveOptions}
        {...otherProps}
      />
    );
  }
);

export default React.memo(DiffEditor);
