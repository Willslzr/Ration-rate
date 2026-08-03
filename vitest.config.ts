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
      thresholds: {
        // core is the pure domain layer — kept to a stricter bar than the
        // adapters in api/sdk, which include harder-to-unit-test glue
        // (Playwright, cron scheduling, the process entrypoint).
        "packages/core/src/**": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
