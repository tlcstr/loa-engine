// @ts-check
// ESLint flat config for a CommonJS TypeScript project.
// See: https://typescript-eslint.io/getting-started/ and Prettier integration notes.
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig(
  // Ignore patterns for flat config (replacement for .eslintignore)
  // Note: .eslintignore не работает с flat config. Держим игноры здесь.
  // Docs: https://eslint.org/docs/latest/use/configure/migration-guide#ignoring-files
  { ignores: ["dist/**", "node_modules/**"] },

  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript recommended + some stricter checks (без навязывания стиля)
  tseslint.configs.recommended,
  tseslint.configs.strict,

  // Project-specific tweaks
  {
    languageOptions: {
      sourceType: "commonjs",
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // Add project-specific rules here if needed.
      // Example: 'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Turn off formatting rules that may conflict with Prettier
  // (мы запускаем ESLint и Prettier отдельными шагами).
  // Docs: https://github.com/prettier/eslint-config-prettier
  eslintConfigPrettier
);
