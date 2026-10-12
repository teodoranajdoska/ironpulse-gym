module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js', 'dist'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
