import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
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
  eslintPluginPrettier, // prettier as an ESLint rule, integrates .prettierrc settings
  eslintConfigPrettier, // disable conflicting prettier rules in eslint,
];
