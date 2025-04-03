module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  overrides: [
    {
      files: ["server/**/*.js"],
      env: {
        node: true,
        browser: false,
      },
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
    {
      files: ["client/src/**/*.jsx", "client/src/**/*.js"],
      env: {
        browser: true,
        node: false,
      },
      extends: ["plugin:react/recommended"],
      rules: {
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
      },
      settings: {
        react: {
          version: "detect",
        },
      },
    },
  ],
};
