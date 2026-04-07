import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist",
  clean: true,
});
