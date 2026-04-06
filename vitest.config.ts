import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";
import { platform } from "node:os";

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
        resolve: {
          dedupe: ["react", "react-dom"],
        },
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
            expect: {
              toMatchScreenshot: {
                resolveScreenshotPath: ({
                  arg,
                  ext,
                  root,
                  screenshotDirectory,
                  testFileDirectory,
                  testFileName,
                  browserName,
                }: {
                  arg: string;
                  ext: string;
                  root: string;
                  screenshotDirectory: string;
                  testFileDirectory: string;
                  testFileName: string;
                  browserName: string;
                }) =>
                  resolve(
                    root,
                    testFileDirectory,
                    screenshotDirectory,
                    testFileName.replace(".compiled", ""),
                    `${arg}-${browserName}-${platform()}${ext}`,
                  ),
              },
            },
          },
        },
      },
    ],
  },
});
