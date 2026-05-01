const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');
const tsEslint = require('typescript-eslint');
const unusedImports = require('eslint-plugin-unused-imports');

const eslintRecommendedRules = {
  ...js.configs.recommended.rules,
  'no-empty-static-block': 'off',
  'no-extra-boolean-cast': 'off',
  'no-loss-of-precision': 'off',
  'no-redeclare': 'off',
  'no-unexpected-multiline': 'off',
  'no-unused-private-class-members': 'off',
  'require-yield': 'off',
};

const unusedVarsOptions = {
  args: 'after-used',
  argsIgnorePattern: '^_',
  vars: 'all',
  varsIgnorePattern: '^_',
};

module.exports = defineConfig(
  {
    ignores: [
      '**/*_pb.d.ts',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      '.packages/**',
      'tmp/**',
      'jest.config.js',
      'proto-codegen.js',
    ],
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      ...eslintRecommendedRules,
      'no-unused-vars': ['error', unusedVarsOptions],
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsEslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      globals: {
        Buffer: 'readonly',
        BufferEncoding: 'readonly',
        NodeJS: 'readonly',
        RequestInit: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        performance: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setImmediate: 'readonly',
        setTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...tsEslint.configs.strictTypeChecked.rules,
      ...tsEslint.configs.stylisticTypeChecked.rules,
      ...prettierConfig.rules,
      ...eslintRecommendedRules,
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/typedef': 'error',
      '@typescript-eslint/unbound-method': 'error',
      'no-implied-eval': 'off',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'no-unused-vars': 'off',
      'require-await': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        unusedVarsOptions,
      ],
    },
  },
  {
    files: ['src/**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
  },
);
