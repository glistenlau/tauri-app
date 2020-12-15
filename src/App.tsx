import { Divider } from "@material-ui/core";
import { createMuiTheme, MuiThemeProvider } from "@material-ui/core/styles";
import React from "react";
import { ThemeProvider } from "styled-components";
import Root from "./containers/Root";
import { initLogger } from "./core/logger";

initLogger();
window.logger.debug("logger loaded.");

const lightTheme = createMuiTheme({
  typography: {
    fontFamily: [
      "Source Code Pro",
      "Ubuntu Mono",
      "Menlo",
      "DejaVu Sans Mono",
      "Cascadia Code",
      "Consolas",
    ].join(","),
  },
  palette: {
    type: "light", // Switching the dark mode on is a single property value change.
    background: { paper: "#fff", default: "#fafafa" },
    primary: {
      light: "#71a4ff",
      main: "#3576cc",
      dark: "#004b9a",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#ff7961",
      main: "#f44336",
      dark: "#ba000d",
      contrastText: "#000000",
    },
  },
});

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      light: "#56454e",
      main: "#ff9abe",
      dark: "#a21547",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ff9abe",
    },
  },
});

const App = () => {
  return (
    <MuiThemeProvider theme={lightTheme}>
      <ThemeProvider theme={lightTheme}>
        <Divider />
        <div className="App">
          <Root />
        </div>
      </ThemeProvider>
    </MuiThemeProvider>
  );
};

export default App;
