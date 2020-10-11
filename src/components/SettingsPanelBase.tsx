import Accordion from "@material-ui/core/Accordion";
import AccordionActions from "@material-ui/core/AccordionActions";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import React from "react";
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
              name={iconName}
              fill="#9ba0a6"
              style={{ marginRight: 10 }}
            />
            <Typography>{title}</Typography>
          </div>
        </AccordionSummary>
        <AccordionDetails>{children(disabled)}</AccordionDetails>
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
  }
);

export default SettingsPanelBase;
