module.exports = {
  root: true,
  env: {
    jest: true,
  },
  extends: [
    '@react-native-community',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jest/recommended',
    'plugin:testing-library/react',
    'prettier',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'import', 'jest', 'testing-library'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'import/no-default-export': 'error',
    'testing-library/no-node-access': 'off',
    'object-shorthand': ['error', 'always'],
    'prefer-const': 'error',
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
    ],
    'react/jsx-handler-names': [
      'error',
      {
        eventHandlerPrefix: 'handle',
        eventHandlerPropPrefix: 'on',
        checkLocalVariables: false,
        checkInlineFunction: false,
      },
    ],
    // @react-native-community/eslint-config enables this rule, but it was
    // removed in @typescript-eslint v7. Disable it here so ESLint does not
    // complain about an unknown rule.
    '@typescript-eslint/func-call-spacing': 'off',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
  overrides: [
    {
      // Re-declare the parser for TS files so ESLint resolves it from the
      // project root (v8) rather than from inside
      // @react-native-community/eslint-config/node_modules/ (v5).
      // @typescript-eslint/consistent-type-imports is also scoped here because
      // in v8 it calls getParserServices, which requires @typescript-eslint/parser.
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', disallowTypeAnnotations: false },
        ],
      },
    },
    {
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      rules: {
        'react/jsx-handler-names': 'off',
      },
    },
  ],
};
