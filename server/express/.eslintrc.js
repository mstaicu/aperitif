module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'eslint-config-prettier'],
  ignorePatterns: ['node_modules/*'],
  overrides: [
    {
      env: {
        node: true,
        es6: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
      ],
      files: ['src/**/*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        '@typescript-eslint/no-unused-vars': ['error'],
        'prettier/prettier': ['error', {}, { usePrettierrc: true }],
      },
    },
  ],
  parserOptions: {
    allowImportExportEverywhere: true,
    ecmaVersion: 8,
    sourceType: 'module',
  },
  rules: {
    strict: ['error', 'never'],
  },
};
