import React from "react";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import { green } from "@material-ui/core/colors";
import { createStyles, withStyles } from "@material-ui/core/styles";

const styles = (theme: any) =>
  createStyles({
    container: {
      backgroundColor: theme.palette.background.default,
      display: "flex",
      flexDirection: "row",
      padding: 10,
    },
    buttonContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      height: 45,
      width: 45,
    },
    select: {
      flex: 1,
      width: 200,
    },
    play: {
      color: green[500],
    },
    process: {
      width: 44,
      height: 44,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  });

class ClassSelect extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {};
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange } = this.props;

    onChange(e.target.value);
  };

  render() {
    const { classes, values, selected } = this.props;
    return (
      <div className={classes.container}>
        <TextField
          className={classes.select}
          size="small"
          id="standard-select-currency"
          label="Java class"
          select
          value={selected}
          variant="outlined"
          onChange={this.handleChange}
          margin="dense"
        >
          {values.map((path: string) => {
            const label = path
              .substring(path.indexOf("com"))
              .replace(/\//gi, ".");

            return (
              <MenuItem key={path} value={path}>
                {label}
              </MenuItem>
            );
          })}
        </TextField>
      </div>
    );
  }
}

export default withStyles(styles, { withTheme: true })(ClassSelect);
