/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: { plugins: ["@emotion/babel-plugin"] },
    }),
    tsconfigPaths(),
  ],
  // the physics worker is bundled apart from the app and only sees these plugins, so it can
  // use the same absolute imports (config.plugins reaches workers in dev only)
  worker: { plugins: () => [tsconfigPaths()] },
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
