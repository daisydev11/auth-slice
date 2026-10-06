import { defineConfig } from "vitest/config";
import path from "node:path";

// Load .env for tests that hit the database (Node 20.12+).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env: database tests will fail with a clear message
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
