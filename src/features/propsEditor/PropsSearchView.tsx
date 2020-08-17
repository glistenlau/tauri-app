import React, {useCallback} from "react";
import SearchBar from "../../components/SearchBar";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../reducers";
import { setClassName, setFilePath, searchProps } from "./propsEditorSlice";


const PropsSearchView = React.memo(() => {
  const filePath = useSelector((state: RootState) => state.propsEditor.searchFilePath);
  const className = useSelector(
    (state: RootState) => state.propsEditor.searchClassName
  );
  const dispatch = useDispatch();

  const handleFilePathChange = useCallback((filePath: string) => {
    dispatch(setFilePath(filePath));
  }, [dispatch]);

  const handleClassNameChange = useCallback((className: string) => {
    dispatch(setClassName(className));
  }, [dispatch]);

  const handleSearch = useCallback(() => {
    dispatch(searchProps({filePath, className}))
  }, [className, dispatch, filePath]);

  return (
    <SearchBar
      searchFolderLabel="Search Folder"
      searchFileLabel="Java Class"
      filePathValue={filePath}
      fileNameValue={className}
      onFilePathChange={handleFilePathChange}
      onFileNameChange={handleClassNameChange}
      onSearch={handleSearch}
    />
  );
});

export default PropsSearchView;
