const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'functions/lib/**', 'coverage/**', 'old/**', '.cursor/**'],
  },
  ...expoConfig,
  {
    rules: {
      'import/namespace': 'off',
      'import/no-duplicates': 'off',
      'import/no-unresolved': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
