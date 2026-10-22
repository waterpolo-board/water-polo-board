import { defineConfig } from "vitest/config";

// base יחסי כדי שהאתר יעבוד גם תחת github.io/<repo>/
export default defineConfig({
  base: "./",
  test: { environment: "node" },
});
