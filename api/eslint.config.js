// ESLint flat config for the API (Node.js, CommonJS, Jest tests).
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Allow unused arguments that start with an underscore, for example Express's (req, res, _next).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['__tests__/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
];
