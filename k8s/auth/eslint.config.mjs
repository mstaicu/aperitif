import pluginJs from "@eslint/js";
import eslintPluginPerfectionst from "eslint-plugin-perfectionist";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPerfectionst.configs["recommended-natural"],
  eslintPluginPrettier, // any rules we setup now in .prettierrc will show up as errors
];
