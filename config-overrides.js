const { override } = require("customize-cra");

const addPlugin = (config) => {
  return config;
};

module.exports = override(
  addPlugin,
);
