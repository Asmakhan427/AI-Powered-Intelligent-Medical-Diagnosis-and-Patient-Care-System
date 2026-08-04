/**
 * Root ESLint config for the whole npm-workspaces monorepo. Both
 * packages/backend and packages/frontend share the TypeScript + Prettier
 * base; the frontend override layers on React/JSX rules since the backend
 * has no React code at all.
 */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    '*.config.js',
    '*.config.ts',
    '.eslintrc.js',
  ],
  overrides: [
    {
      files: ['packages/frontend/**/*.{ts,tsx}'],
      env: { browser: true, node: false },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      plugins: ['react', 'react-hooks', 'react-refresh'],
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
      settings: {
        react: { version: 'detect' },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // Vite's react-jsx transform doesn't need it
        'react/prop-types': 'off', // TypeScript covers this
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
    },
    {
      files: ['packages/backend/**/*.ts'],
      env: { browser: false, node: true },
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }], // prefer the winston logger — see src/utils/logger.ts
      },
    },
    {
      files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
      env: { jest: true },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
