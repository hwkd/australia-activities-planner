import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests run in plain Node (not via Astro's Cloudflare/workerd setup); D1 is replaced by
// Node's built-in SQLite in tests/unit/d1.ts.
export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
  },
});
