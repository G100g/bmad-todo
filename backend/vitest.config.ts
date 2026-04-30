import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Existing unit test config...

    // Add integration test support
    include: [
      "src/**/*.test.ts", // Unit tests (co-located)
      "test/**/*.integration.test.ts", // Integration tests
    ],
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    pool: "forks", // Use forks to isolate each test
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage-integration",
      reporter: ["text", "json", "html", "json-summary"],
      include: ["dist/**/*.{ts,js}"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.test.ts",
        "**/*.integration.test.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
