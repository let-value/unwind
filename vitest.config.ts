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
          alias: {
            react: resolve("node_modules/react"),
            "react-dom": resolve("node_modules/react-dom"),
            "react/jsx-dev-runtime": resolve("node_modules/react/jsx-dev-runtime.js"),
            "react/jsx-runtime": resolve("node_modules/react/jsx-runtime.js"),
            "next-themes": resolve("node_modules/next-themes/dist/index.mjs"),
            sonner: resolve("node_modules/sonner/dist/index.mjs"),
          },
          dedupe: ["react", "react-dom"],
        },
        optimizeDeps: {
          include: [
            "@base-ui/react/button",
            "@base-ui/react/menu",
            "@base-ui/react/scroll-area",
            "@base-ui/react/tabs",
            "@base-ui/react/toggle",
            "class-variance-authority",
            "clsx",
            "lucide-react",
            "next-themes",
            "sonner",
            "tailwind-merge",
            "vaul",
            "vitest-browser-react",
          ],
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
