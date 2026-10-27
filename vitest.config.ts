import { defineConfig } from "vitest/config";

// Unit tests for the receiver protocol and schedule logic. Run with `npm test`.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
  },
});
