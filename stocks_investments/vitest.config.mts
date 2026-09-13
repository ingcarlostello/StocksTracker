import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["domain/**/*.test.ts", "adapters/**/*.test.ts", "utils/**/*.test.ts"],
  },
});
