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
    poolOptions: {
      forks: {
        singleFork: true, // Each test file runs in its own process
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "dist/",
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
