import React, { useCallback } from "react";
import SearchBar from "../../components/SearchBar";
import { AppStateKey, useSearchJavaPropsMutation } from "../../generated/graphql";
import { useAppState } from "../../hooks/useAppState";

const PropsSearchView = React.memo(() => {
  const [filepath, setFilepath] = useAppState(AppStateKey.PropsSearchFilepath, "");
  const [classPattern, setClassPattern] = useAppState(AppStateKey.PropsSearchClassPattern, "");

  const [searchJavaProps] = useSearchJavaPropsMutation();

  const handleSearch = useCallback(async (filePath: string, fileName: string) => {
    await searchJavaProps({
      variables: {
        filepath: filePath,
        classPattern: fileName,
        validatePgQueries: true,
      }
    })
  }, [searchJavaProps]);

  return (
    <SearchBar
      searchFolderLabel="Search Folder"
      searchFileLabel="Java Class"
      filePathValue={filepath}
      fileNameValue={classPattern}
      onFilePathChange={setFilepath}
      onFileNameChange={setClassPattern}
      onSearch={handleSearch}
    />
  );
});

export default PropsSearchView;
