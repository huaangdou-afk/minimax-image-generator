import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  // Ignore test/utility scripts and internal files
  {
    ignores: [
      'tests/cdp-*.js',
      'tests/cdp*.js',
      'quick_test.js',
      'scenario_test.js',
      '.claude/**/*.js',
      'multi-agent-dashboard/',
    ],
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        describe: 'readonly', test: 'readonly', expect: 'readonly',
        it: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly', jest: 'readonly',
        console: 'readonly',
      },
    },
    rules: { 'no-undef': 'off', 'no-unused-vars': 'off' },
  },
  {
    files: ['public/**/*.js', 'dashboard-public/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        refreshAll: 'readonly', refreshCell: 'readonly',
        closeModal: 'readonly', _modalCurrentId: 'readonly',
      },
    },
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['server.js', 'parse_prompts.js', 'playwright.config.js', 'dashboard-agents/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        console: 'readonly', __dirname: 'readonly', __filename: 'readonly',
        process: 'readonly', module: 'readonly', require: 'readonly',
        exports: 'readonly', global: 'readonly', Buffer: 'readonly',
      },
    },
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: { sourceType: 'module', globals: { console: 'readonly' } },
    rules: { 'no-undef': 'off' },
  },
];
