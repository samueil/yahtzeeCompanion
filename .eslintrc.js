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
    'prettier/prettier': 'error',
    'no-unused-vars': 'warn',
    'import/no-default-export': 'error',
    'testing-library/no-node-access': 'off', // Mostly a web rule, react-native testing library accesses nodes differently
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/classnames-order': 'warn',
    'object-shorthand': ['error', 'always'],
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module', // Important for module syntax
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
};
