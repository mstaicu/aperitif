// @ts-check
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPerfectionst from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  eslintPluginPerfectionst.configs["recommended-natural"],
  eslintPluginPrettierRecommended,
  eslintConfigPrettier,
];
