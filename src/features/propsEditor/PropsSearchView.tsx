import React, { useCallback, useContext } from "react";
import SearchBar from "../../components/SearchBar";
import { AppStateKey, useSearchJavaPropsMutation } from "../../generated/graphql";
import { useAppState } from "../../hooks/useAppState";
import { PropsListContext } from "./PropsListView";

const PropsSearchView = React.memo(() => {
  const [filepath, setFilepath] = useAppState(AppStateKey.PropsSearchFilepath, "");
  const [classPattern, setClassPattern] = useAppState(AppStateKey.PropsSearchClassPattern, "");

  const [searchJavaProps] = useSearchJavaPropsMutation();
  const { setClassList, setSelectedClass, setSelectedPropKey, setPropKeyList, setPropValues } = useContext(PropsListContext);
  const handleSearch = useCallback(async (filePath: string, fileName: string) => {
    const { data } = await searchJavaProps({
      variables: {
        filepath: filePath,
        classPattern: fileName,
        validatePgQueries: true,
      }
    });
    if (!data) {
      return;
    }

    const { classList, selectedClass, selectedPropKey, propKeyList, propVals } = data.searchJavaProps;

    setClassList(classList || []);
    setSelectedClass(selectedClass || "");
    setSelectedPropKey(selectedPropKey || "");
    setPropKeyList(propKeyList || []);
    setPropValues((propVals as [string, string] | undefined) || ["", ""]);
  }, [searchJavaProps, setClassList, setPropKeyList, setPropValues, setSelectedClass, setSelectedPropKey]);

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
