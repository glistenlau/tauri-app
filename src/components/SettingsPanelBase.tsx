import React from "react";

import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpansionPanelSummary from "@material-ui/core/ExpansionPanelSummary";
import ExpansionPanelActions from "@material-ui/core/ExpansionPanelActions";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import Typography from "@material-ui/core/Typography";

import SVGIcon from "./SVGIcon";

const SettingsPanelBase = React.memo(
  ({ onSubmit, title, children, iconName }: any) => {
    const [disabled, setDisabled] = React.useState(true);

    const handleClickEdit = React.useCallback(() => {
      setDisabled(false);
    }, []);

    const handleClickOK = React.useCallback(() => {
      onSubmit(true);
      setDisabled(true);
    }, [onSubmit]);

    const handleClickCancel = React.useCallback(() => {
      onSubmit(false);
      setDisabled(true);
    }, [onSubmit]);

    return (
      <ExpansionPanel>
        <ExpansionPanelSummary
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
              name={iconName}
              fill="#9ba0a6"
              style={{ marginRight: 10 }}
            />
            <Typography>{title}</Typography>
          </div>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails>{children(disabled)}</ExpansionPanelDetails>
        <Divider />
        {!disabled && (
          <ExpansionPanelActions>
            <Button size="small" onClick={handleClickCancel}>
              Cancel
            </Button>
            <Button size="small" onClick={handleClickOK} color="primary">
              Save
            </Button>
          </ExpansionPanelActions>
        )}
        {disabled && (
          <ExpansionPanelActions>
            <Button size="small" color="primary" onClick={handleClickEdit}>
              Edit
            </Button>
          </ExpansionPanelActions>
        )}
      </ExpansionPanel>
    );
  }
);

export default SettingsPanelBase;
