import Accordion from "@material-ui/core/Accordion";
import AccordionActions from "@material-ui/core/AccordionActions";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import React from "react";
import { DBType } from "../apis/sqlCommon";
import { Config } from "../generated/graphql";
import SVGIcon from "./SVGIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      paddingRight: 10,
      paddingLeft: 10,
      paddingTop: 10,
    },
    hostContainer: {
      display: "flex",
      flexDirection: "row",
    },
    mainInput: {
      width: 200,
    },
    input: {
      width: 120,
      marginLeft: 20,
    },
  })
);

interface DBSettingsProps {
  onChange: (config: Config) => void;
  title: string;
  value: Config;
  type: DBType;
}

const DBSettings = ({ onChange, title, value, type }: DBSettingsProps) => {
  const classes = useStyles();
  const [localValue, setLocalValue] = React.useState(Object.assign({}, value));
  const [disabled, setDisabled] = React.useState(true);

  const handleChange = React.useCallback(
    (key: string, val: string) => {
      const newValue = Object.assign({}, localValue, {
        [key]: val,
      });
      setLocalValue(newValue);
    },
    [localValue]
  );

  const handleClickEdit = React.useCallback(() => {
    setDisabled(false);
  }, []);

  const handleClickOK = React.useCallback(() => {
    onChange(localValue);
    setDisabled(true);
  }, [onChange, localValue]);

  const handleClickCancel = React.useCallback(() => {
    setLocalValue(value);
    setDisabled(true);
  }, [value]);

  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={title}
        id={title}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <SVGIcon
            width={20}
            height={20}
            fill={type === DBType.Oracle ? "red" : undefined}
            name={type === DBType.Oracle ? "database" : "postgres"}
            style={{ marginRight: 10 }}
          />
          <Typography>{title}</Typography>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className={classes.container}>
          <div className={classes.hostContainer}>
            <TextField
              className={classes.mainInput}
              color="primary"
              disabled={disabled}
              id="host"
              label="Host"
              size="small"
              onChange={(e) => handleChange("host", e.target.value)}
              value={localValue.host}
              margin="dense"
            />
            <TextField
              className={classes.input}
              color="primary"
              disabled={disabled}
              id="port"
              label="Port"
              size="small"
              onChange={(e) => handleChange("port", e.target.value)}
              value={localValue.port}
              margin="dense"
            />
          </div>
          <TextField
            className={classes.mainInput}
            color="primary"
            disabled={disabled}
            id="db"
            label={type === DBType.Oracle ? "SID" : "DBName"}
            size="small"
            onChange={(e) => handleChange("db", e.target.value)}
            value={localValue.db}
            margin="dense"
          />
          <TextField
            className={classes.mainInput}
            color="primary"
            disabled={disabled}
            id="user"
            label="User"
            size="small"
            onChange={(e) => handleChange("username", e.target.value)}
            value={localValue.username}
            margin="dense"
          />
          <TextField
            className={classes.mainInput}
            color="primary"
            disabled={disabled}
            id="password"
            type="password"
            label="Password"
            size="small"
            onChange={(e) => handleChange("password", e.target.value)}
            value={localValue.password}
            margin="dense"
          />
        </div>
      </AccordionDetails>
      <Divider />
      {!disabled && (
        <AccordionActions>
          <Button size="small" onClick={handleClickCancel}>
            Cancel
          </Button>
          <Button size="small" onClick={handleClickOK} color="primary">
            Save
          </Button>
        </AccordionActions>
      )}
      {disabled && (
        <AccordionActions>
          <Button size="small" color="primary" onClick={handleClickEdit}>
            Edit
          </Button>
        </AccordionActions>
      )}
    </Accordion>
  );
};

export default DBSettings;
