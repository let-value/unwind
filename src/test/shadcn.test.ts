import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { resolveShadcnProject } from "../shadcn.ts";

const path = fileURLToPath(new URL("./shadcn/project/components.json", import.meta.url));
const packageJsonPath = fileURLToPath(new URL("./shadcn/project/package.json", import.meta.url));
const cssPath = fileURLToPath(new URL("./shadcn/project/src/index.css", import.meta.url));
const componentsPath = fileURLToPath(new URL("./shadcn/project/src/components", import.meta.url));
const uiPath = fileURLToPath(new URL("./shadcn/project/src/components/ui", import.meta.url));

test("reads the configured index.css source from components.json", async () => {
  const source = await resolveShadcnProject(path);
  const css = await readFile(cssPath, "utf8");

  expect(source).toMatchObject({
    packageJsonPath,
    cssPath,
    css,
    componentsPath,
    uiPath,
  });
});
