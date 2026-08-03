import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**"],
      exclude: ["**/*.test.ts", "**/dist/**", "**/generated/**", "**/__fixtures__/**"],
    },
  },
});
