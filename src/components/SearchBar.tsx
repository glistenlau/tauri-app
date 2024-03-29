import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import SearchIcon from "@material-ui/icons/Search";
import React from "react";
import ProcessIconButton from "./ProgressIconButton";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "column",
      paddingRight: 10,
      paddingLeft: 10,
      paddingTop: 10,
    },
    classNameContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },
    searchPath: {
      flex: 1,
      marginTop: 10,
    },
    searchClass: {
      flex: 1,
    },
    process: {
      width: 48,
      height: 48,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  })
);

interface SearchBarProps {
  onFilePathChange: (filePath: string) => void;
  onFileNameChange: (fileName: string) => void;
  onSearch: (filePath: string, fileName: string) => void;
  filePathValue: string;
  fileNameValue: string;
  searchFolderLabel: string;
  searchFileLabel: string;
  isLoading?: boolean;
}

const SearchBar = React.memo(
  ({
    onFilePathChange,
    onFileNameChange,
    onSearch,
    filePathValue,
    fileNameValue,
    searchFolderLabel,
    searchFileLabel,
    isLoading,
  }: SearchBarProps) => {
    const classes = useStyles();

    const handleFilePathChange = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const filePath = e.target.value;
        onFilePathChange(filePath);
      },
      [onFilePathChange]
    );

    const handleClassNameChange = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const className = e.target.value;
        onFileNameChange(className);
      },
      [onFileNameChange]
    );

    const handleSearch = React.useCallback(async () => {
      await onSearch(filePathValue, fileNameValue);
    }, [onSearch, filePathValue, fileNameValue]);

    return (
      <div className={classes.container}>
        <TextField
          className={classes.searchPath}
          color="primary"
          id="file-path"
          label={searchFolderLabel}
          size="small"
          variant="outlined"
          onChange={handleFilePathChange}
          value={filePathValue}
          margin="dense"
        />
        <div className={classes.classNameContainer}>
          <TextField
            className={classes.searchClass}
            color="primary"
            id="class-name"
            label={searchFileLabel}
            size="small"
            variant="outlined"
            onChange={handleClassNameChange}
            value={fileNameValue}
            margin="dense"
          />
          <ProcessIconButton loading={isLoading} onClick={handleSearch}>
            <SearchIcon color="primary" />
          </ProcessIconButton>
        </div>
      </div>
    );
  }
);

export default SearchBar;
