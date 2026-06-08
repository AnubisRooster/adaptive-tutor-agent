import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    globals: false,
    // Tests share one SQLite test database; run serially to avoid races.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_PATH: "./data/test.db",
      // Point Ollama at an unused port so any accidental call fails fast and
      // exercises the graceful-fallback paths instead of hanging.
      OLLAMA_HOST: "http://127.0.0.1:59999",
    },
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
});
