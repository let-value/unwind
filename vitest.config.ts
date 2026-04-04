import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**"],
          environment: "node",
        },
      },
      {
        plugins: [react(), tailwindcss()],
        test: {
          name: "browser",
          include: ["**/*.test.tsx"],
          exclude: ["**/node_modules/**"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
        },
      },
    ],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
