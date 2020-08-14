import React from "react";
import Button from "@material-ui/core/Button";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Dialog from "@material-ui/core/Dialog";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";

const options = ["Copy oracle statement", "Copy postgres statement"];

export interface SaveDialogProps {
  id: string;
  keepMounted: boolean;
  value: number;
  open: boolean;
  onClose: (value?: number) => void;
}

function SaveDialog(props: SaveDialogProps) {
  const { onClose, value: valueProp, open, ...other } = props;
  const [value, setValue] = React.useState(valueProp);
  const radioGroupRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!open) {
      setValue(valueProp);
    }
  }, [valueProp, open]);

  const handleEntering = React.useCallback(() => {
    if (radioGroupRef.current != null) {
      radioGroupRef.current.focus();
    }
  }, []);

  const handleCancel = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOk = React.useCallback(() => {
    onClose(value);
  }, [onClose, value]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(parseInt(event.target.value, 10));
    },
    []
  );

  return (
    <Dialog
      disableBackdropClick
      disableEscapeKeyDown
      maxWidth="xs"
      onEntering={handleEntering}
      aria-labelledby="confirmation-dialog-title"
      open={open}
      {...other}
    >
      <DialogTitle id="confirmation-dialog-title">
        Copy schema replaced statement
      </DialogTitle>
      <DialogContent dividers>
        <RadioGroup
          ref={radioGroupRef}
          aria-label="copy"
          name="copy"
          value={value}
          onChange={handleChange}
        >
          {options.map((option, index) => (
            <FormControlLabel
              value={index}
              key={option}
              control={<Radio />}
              label={option}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={handleCancel} color="primary">
          Cancel
        </Button>
        <Button onClick={handleOk} color="primary">
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SaveDialog;
