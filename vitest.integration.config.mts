import { configDefaults, defineConfig } from "vitest/config";
import base from "./vitest.config.mjs";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["src/**/*.int.test.ts", "packages/**/*.int.test.ts"],
    exclude: [...configDefaults.exclude],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
