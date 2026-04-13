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
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', disallowTypeAnnotations: false },
    ],
    'padding-line-between-statements': [
      'warn',
      { blankLine: 'always', prev: '*', next: 'return' },
    ],
    'react/jsx-handler-names': [
      'warn',
      {
        eventHandlerPrefix: 'handle',
        eventHandlerPropPrefix: 'on',
        checkLocalVariables: false,
        checkInlineFunction: false,
      },
    ],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    // THIS FIXES THE TS 6.0.2 WARNING
    warnOnUnsupportedTypeScriptVersion: false,
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
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      rules: {
        'react/jsx-handler-names': 'off',
      },
    },
  ],
};
