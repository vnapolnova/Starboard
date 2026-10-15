import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'docs/shots', 'design', 'features', 'functions/lib'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['functions/src/**/*.ts', 'functions/test/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    // shoot.mjs runs page.evaluate callbacks in the browser.
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
);
