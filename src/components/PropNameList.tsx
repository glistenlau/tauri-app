import { green, orange, red } from "@material-ui/core/colors";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import ErrorIcon from "@material-ui/icons/Error";
import WarningIcon from "@material-ui/icons/Warning";
import React from "react";
import { PropKey, PropValStatus, ValidationStatus } from "../generated/graphql";
import MatchText from "./MatchText";
import SVGIcon from "./SVGIcon";
import Tooltip from "./Tooltip";

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
  propNameList: Array<PropKey>;
  selectedProp: string;
  onListItemClick: (selectedProp: string) => void;
}

interface PropNameProps {
  prop: PropKey;
  selectedProp: string;
  onClick: (selectedProp: string) => void;
  validateResults?: any;
  searchText: string;
}

const PropName = React.memo(
  ({
    prop,
    selectedProp,
    onClick,
    validateResults,
    searchText,
  }: PropNameProps) => {
    const classes = useStyles();

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
          {prop.validationStatus &&
            prop.validationStatus === ValidationStatus.Pass && (
              <ListItemIcon className={classes.iconContainer}>
                <CheckBoxIcon className={classes.greenIcon} />
              </ListItemIcon>
            )}
          {prop.validationStatus &&
            prop.validationStatus === ValidationStatus.Error && (
              <ListItemIcon className={classes.iconContainer}>
                <ErrorIcon className={classes.redIcon} />
              </ListItemIcon>
            )}
          {prop.validationStatus &&
            prop.validationStatus === ValidationStatus.Warning && (
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
                {[PropValStatus.Both, PropValStatus.OracleOnly].includes(
                  prop.valStatus
                ) && (
                  <SVGIcon
                    style={{ flexShrink: 0, marginRight: 3 }}
                    name="database"
                    width={20}
                    height={20}
                  />
                )}
                {[PropValStatus.Both, PropValStatus.PostgresOnly].includes(
                  prop.valStatus
                ) && (
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
  const { propNameList, selectedProp, onListItemClick } = props;

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
            searchText={searchText}
          />
        ))}
      </List>
    </div>
  );
};

export default React.memo(PropNameList);
