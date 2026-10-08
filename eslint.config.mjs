import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The harness is reusable across projects: it must not depend on this app.
  {
    files: ["lib/harness/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/*", "../../*"], message: "lib/harness must stay app-agnostic. Pass app-specific things in as arguments." },
          { group: ["next", "next/*", "react", "react-dom"], message: "lib/harness must not depend on a framework." },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
