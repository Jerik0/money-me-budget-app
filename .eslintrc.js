module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'angular'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:angular/recommended'
  ],
  env: {
    browser: true,
    es6: true,
    node: true
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    
    // Angular specific rules
    'angular/component-selector': 'off',
    'angular/directive-selector': 'off',
    'angular/no-empty-lifecycle-method': 'off',
    'angular/prefer-on-push-component-change-detection': 'off',
    
    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  ],
};
