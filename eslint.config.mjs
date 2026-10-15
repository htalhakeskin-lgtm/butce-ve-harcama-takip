import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

/** code-style standard §5.3 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Dialogs and single-purpose forms focus their first field (WAI-ARIA dialog pattern, ui standard §7).
      "jsx-a11y/no-autofocus": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "XSS risk (security standard §9).",
        },
        {
          selector: "CallExpression[callee.property.name=/^toLocale(Lower|Upper)Case$/][arguments.length=0]",
          message: "Pass a locale: Turkish İ/ı casing differs (code-style §5.5).",
        },
        {
          selector: "CallExpression[callee.name='parseFloat']",
          message: "Use parseMoney from @/lib/money for amounts.",
        },
      ],
    },
  },
  {
    files: ["src/features/**/domain/**/*.ts", "src/lib/money.ts", "src/lib/dates.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Domain code receives 'today' as a parameter.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "standards_ornek/**",
    "src/server/db/migrations/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
