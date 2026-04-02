import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
  },
  format: "esm",
  clean: true,
  dts: true,
  sourcemap: true,
  platform: "node",
  target: "node22",
  outDir: "dist",
  deps: {
    alwaysBundle: [/^(?!node:)/],
  },
});
