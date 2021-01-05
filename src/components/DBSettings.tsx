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
import {
  isOracleSettings,
  OracleSettings,
  PostgreSettings
} from "../features/settings/settingsSlice";
import SVGIcon from "./SVGIcon";

const useStyles = makeStyles((theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column",
      paddingRight: 10,
      paddingLeft: 10,
      paddingTop: 10
    },
    hostContainer: {
      display: "flex",
      flexDirection: "row"
    },
    mainInput: {
      width: 200
    },
    input: {
      width: 120,
      marginLeft: 20
    }
  })
);

interface DBSettingsProps {
  onChange: (config: OracleSettings | PostgreSettings) => void;
  title: string;
  value: OracleSettings | PostgreSettings;
}

const extractData = (config: OracleSettings | PostgreSettings) => {
  if ("sid" in config) {
    return [config.sid, "SID", "sid"];
  } else {
    return [config.dbname, "DBname", "dbname"];
  }
};

const DBSettings = ({ onChange, title, value }: DBSettingsProps) => {
  const classes = useStyles();
  const [localValue, setLocalValue] = React.useState(Object.assign({}, value));
  const [disabled, setDisabled] = React.useState(true);
  const [sidValue, sidLabel, sidId] = extractData(value);
  const isOracle = isOracleSettings(value);

  const handleChange = React.useCallback(
    (key: string, val: string) => {
      const newValue = Object.assign({}, localValue, {
        [key]: val
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
            alignItems: "center"
          }}
        >
          <SVGIcon
            width={20}
            height={20}
            fill={isOracle ? "red" : undefined}
            name={isOracle ? "database" : "postgres"}
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
              color='primary'
              disabled={disabled}
              id='host'
              label='Host'
              size='small'
              onChange={(e) => handleChange("host", e.target.value)}
              value={localValue.host}
              margin='dense'
            />
            <TextField
              className={classes.input}
              color='primary'
              disabled={disabled}
              id='port'
              label='Port'
              size='small'
              onChange={(e) => handleChange("port", e.target.value)}
              value={localValue.port}
              margin='dense'
            />
          </div>
          <TextField
            className={classes.mainInput}
            color='primary'
            disabled={disabled}
            id={sidId}
            label={sidLabel}
            size='small'
            onChange={(e) => handleChange(sidId, e.target.value)}
            value={sidValue}
            margin='dense'
          />
          <TextField
            className={classes.mainInput}
            color='primary'
            disabled={disabled}
            id='user'
            label='User'
            size='small'
            onChange={(e) => handleChange("user", e.target.value)}
            value={localValue.user}
            margin='dense'
          />
          <TextField
            className={classes.mainInput}
            color='primary'
            disabled={disabled}
            id='password'
            type='password'
            label='Password'
            size='small'
            onChange={(e) => handleChange("password", e.target.value)}
            value={localValue.password}
            margin='dense'
          />
        </div>
      </AccordionDetails>
      <Divider />
      {!disabled && (
        <AccordionActions>
          <Button size='small' onClick={handleClickCancel}>
            Cancel
          </Button>
          <Button size='small' onClick={handleClickOK} color='primary'>
            Save
          </Button>
        </AccordionActions>
      )}
      {disabled && (
        <AccordionActions>
          <Button size='small' color='primary' onClick={handleClickEdit}>
            Edit
          </Button>
        </AccordionActions>
      )}
    </Accordion>
  );
};

export default DBSettings;
