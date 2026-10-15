import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "references/**",
    "cloudflare-worker.ts",
    ".open-next/**",
    ".wrangler/**",
    "design-references/**",
    "workers/*/worker-configuration.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/next-link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import Link from @/lib/next-link (prefetch off by default; see docs/request-cost.md).",
            },
            {
              name: "next/dist/client/app-dir/link",
              message: "Import Link from @/lib/next-link.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
