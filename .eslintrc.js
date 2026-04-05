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
    'plugin:tailwindcss/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  plugins: ['prettier', 'import', 'jest', 'testing-library', 'tailwindcss'],
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
    'testing-library/no-node-access': 'off', // Mostly a web rule, react-native testing library accesses nodes differently
    'tailwindcss/no-custom-classname': 'off', // NativeWind uses custom class names often
    'tailwindcss/classnames-order': 'warn', // Let prettier handle it, but warn if missed
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
