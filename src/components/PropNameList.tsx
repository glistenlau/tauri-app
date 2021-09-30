import React from "react";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import { green, red, orange } from "@material-ui/core/colors";
import TextField from "@material-ui/core/TextField";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import ErrorIcon from "@material-ui/icons/Error";
import WarningIcon from "@material-ui/icons/Warning";
import Tooltip from "./Tooltip";
import MatchText from "./MatchText";
import SVGIcon from "./SVGIcon";
import { PropsValidMap } from "../apis/javaProps";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "10%",
    },
    list: {
      flex: 1,
      height: "50%",
      overflowY: "scroll",
      overflowX: "hidden",
    },
    searchBar: {
      marginTop: 10,
      paddingLeft: 10,
      paddingRight: 10,
    },
    iconContainer: {
      minWidth: 30,
    },
    redIcon: {
      fontSize: 20,
      color: red[500],
    },
    greenIcon: {
      fontSize: 20,
      color: green[500],
    },
    yellowIcon: {
      fontSize: 20,
      color: orange[500],
    },
  })
);

interface PropNameListProps {
  propNameList: Array<any>;
  selectedProp: string;
  onListItemClick: Function;
  validateResults?: PropsValidMap;
}

const PropName = React.memo(
  ({ prop, selectedProp, onClick, validateResults, searchText }: any) => {
    const classes = useStyles();
    const propValidateResult = React.useMemo(
      () => validateResults && validateResults[prop.name],
      [prop.name, validateResults]
    );

    const handleClick = React.useCallback(() => {
      onClick(prop.name);
    }, [onClick, prop.name]);

    return (
      <Tooltip
        interactive
        leaveDelay={500}
        enterNextDelay={500}
        enterDelay={1000}
        title={prop.name}
      >
        <ListItem
          button
          selected={selectedProp === prop.name}
          onClick={handleClick}
        >
          {propValidateResult && propValidateResult.status === "pass" && (
            <ListItemIcon className={classes.iconContainer}>
              <CheckBoxIcon className={classes.greenIcon} />
            </ListItemIcon>
          )}
          {propValidateResult && propValidateResult.status === "error" && (
            <ListItemIcon className={classes.iconContainer}>
              <ErrorIcon className={classes.redIcon} />
            </ListItemIcon>
          )}
          {propValidateResult && propValidateResult.status === "warn" && (
            <ListItemIcon className={classes.iconContainer}>
              <WarningIcon className={classes.yellowIcon} />
            </ListItemIcon>
          )}
          <ListItemText
            primary={
              <span
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  <MatchText text={prop.name} highlightText={searchText} />
                </span>
                {prop.oracle && (
                  <SVGIcon
                    style={{ flexShrink: 0, marginRight: 3 }}
                    name="database"
                    width={20}
                    height={20}
                  />
                )}
                {prop.postgres && (
                  <SVGIcon
                    style={{ flexShrink: 0, marginRight: 3 }}
                    name="postgres"
                    width={20}
                    height={20}
                  />
                )}
              </span>
            }
          />
        </ListItem>
      </Tooltip>
    );
  }
);

const PropNameList = (props: PropNameListProps) => {
  const { propNameList, selectedProp, onListItemClick, validateResults } =
    props;

  const [searchText, setSearchText] = React.useState("");
  const classes = useStyles();

  const filteredPropNameList = React.useMemo(() => {
    if (!searchText) {
      return propNameList;
    }

    return propNameList.filter(
      (prop) =>
        prop && prop.name && prop.name.toLowerCase().indexOf(searchText) !== -1
    );
  }, [searchText, propNameList]);

  const handleSearchTextChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value.toLowerCase());
    },
    []
  );

  return (
    <div className={classes.container}>
      <TextField
        className={classes.searchBar}
        placeholder="Search..."
        margin="dense"
        size="small"
        id="filled-basic"
        variant="outlined"
        onChange={handleSearchTextChange}
      />
      <List className={classes.list} component="div">
        {filteredPropNameList.map((prop) => (
          <PropName
            key={prop.name}
            prop={prop}
            selectedProp={selectedProp}
            onClick={onListItemClick}
            validateResults={validateResults}
            searchText={searchText}
          />
        ))}
      </List>
    </div>
  );
};

export default React.memo(PropNameList);
