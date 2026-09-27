import babelParser from "@babel/eslint-parser";
import pluginJs from "@eslint/js";
import eslintPluginPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: globals.node,
    },
    ...pluginJs.configs.recommended,
  },
  {
    files: ["test/e2e/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: ["@babel/plugin-syntax-typescript"],
        },
        requireConfigFile: false,
      },
    },
  },
  eslintPluginPerfectionist.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
];
