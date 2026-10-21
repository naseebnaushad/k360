import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Features expose a public API via index.ts (and server/index.ts).
      // Reaching into another feature's internals is not allowed.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*", "!@/features/*/server"],
              message:
                "Import from the feature's public API: @/features/<name> or @/features/<name>/server.",
            },
          ],
        },
      ],
      // Environment variables are read and validated in src/config only.
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: "Read environment variables through @/config/env.",
        },
      ],
    },
  },
  {
    files: [
      "src/config/**",
      "scripts/**",
      "tests/security/env.ts",
      "*.config.ts",
      "*.config.mts",
      "*.config.mjs",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party files copied by scripts/vendor.
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
