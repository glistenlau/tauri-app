const { override } = require("customize-cra");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const addPlugin = (config) => {
  const maonacoPlugin = new MonacoWebpackPlugin();

  config.plugins.push(maonacoPlugin);
  return config;
};

module.exports = override(
  addPlugin,
);