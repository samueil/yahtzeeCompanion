module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'eslint:recommended',
    'plugin:react/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'import'],
  rules: {
    // You can override/add rules here.
    // Enforce single quotes, allowing template literals
    quotes: [
      'error',
      'single',
      { avoidEscape: true, allowTemplateLiterals: true },
    ],
    // Ensure Prettier formatting errors are reported as ESLint errors
    'prettier/prettier': ['error', { singleQuote: true, endOfLine: 'auto' }],
    // Warn about unused variables
    'no-unused-vars': 'warn',
    // Enforce no default exports, as requested
    'import/no-default-export': 'error',
  },
  parserOptions: {
    ecmaVersion: 2020, // Or whatever modern JS version you're targeting
    sourceType: 'module', // Important for module syntax
  },
  // Tell ESLint where to find imports
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
};
