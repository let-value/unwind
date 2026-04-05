import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { resolveShadcnProject } from "../shadcn.ts";

const path = fileURLToPath(new URL("./shadcn/project/components.json", import.meta.url));

test("reads the configured index.css source from components.json", async () => {
  const source = await resolveShadcnProject(path);

  expect(source).toBeDefined();
});
