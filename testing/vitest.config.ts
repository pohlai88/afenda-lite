import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": root,
      "server-only": path.resolve(__dirname, "mocks/server-only.ts"),
      "next/image": path.resolve(__dirname, "mocks/next-image.tsx"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: [
            "lib/**/*.test.ts",
            "modules/**/*.test.ts",
            "features/**/*.test.ts",
            "features/**/*.test.tsx",
            "app/api/**/*.test.ts",
          ],
          exclude: ["**/*.interaction.test.tsx", "**/*.a11y.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "interaction",
          environment: "jsdom",
          setupFiles: [path.resolve(__dirname, "vitest.setup.ts")],
          include: ["**/*.interaction.test.tsx", "**/*.a11y.test.tsx"],
          // Radix portals + next/image + fake-timer suites need a stable single worker.
          maxWorkers: 1,
          testTimeout: 15_000,
        },
      },
    ],
  },
});
