import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import angular from 'eslint-plugin-angular';
import html from 'eslint-plugin-html';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        // Angular globals
        ng: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      angular: angular,
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
      'no-var': 'error',
      'no-undef': 'error'
    },
  },
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: html.parser,
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      html: html,
    },
    rules: {
      // Indentation rules for HTML
      'indent': ['error', 2, {
        'SwitchCase': 1,
        'VariableDeclarator': 1,
        'outerIIFEBody': 1,
        'MemberExpression': 1,
        'FunctionDeclaration': { 'parameters': 1, 'body': 1 },
        'FunctionExpression': { 'parameters': 1, 'body': 1 },
        'CallExpression': { 'arguments': 1 },
        'ArrayExpression': 1,
        'ObjectExpression': 1,
        'ImportDeclaration': 1,
        'flatTernaryExpressions': false,
        'ignoreComments': false,
        'ignoredNodes': ['JSXElement', 'JSXElement > *', 'JSXAttribute', 'JSXIdentifier', 'JSXNamespacedName', 'JSXMemberExpression', 'JSXSpreadAttribute', 'JSXExpressionContainer', 'JSXOpeningElement', 'JSXClosingElement', 'JSXFragment', 'JSXOpeningFragment', 'JSXClosingFragment', 'JSXText', 'JSXEmptyExpression', 'JSXSpreadChild']
      }],
      'no-mixed-spaces-and-tabs': 'error',
      'no-trailing-spaces': 'error',
      'eol-last': 'error'
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js'],
  },
];
