import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
      "@thegamies/db": path.resolve(root, "./packages/db/src/index.ts"),
      "@thegamies/db/schema": path.resolve(root, "./packages/db/src/schema.ts"),
      "@thegamies/igdb": path.resolve(root, "./packages/igdb/src/index.ts"),
    },
  },
});
