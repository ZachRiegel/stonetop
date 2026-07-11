import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".amplify", ".yarn"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/**"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["amplify/**", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
);
