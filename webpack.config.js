// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const path = require("path");

// eslint-disable-next-line no-undef
module.exports = {
  mode: "production",
  entry: "./lib/index.js",

  output: {
    filename: "bundle.js",
    // eslint-disable-next-line no-undef
    path: path.resolve(__dirname, "lib"),
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};
