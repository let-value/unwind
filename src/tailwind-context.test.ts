import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import {
  resolveTailwindCssEntryPath,
  resolveTailwindProjectContext,
} from "./tailwind-context.ts";

describe("resolveTailwindProjectContext", () => {
  it("resolves the shadcn fixture project context from a component path", async () => {
    const buttonFilePath = fileURLToPath(
      new URL("./test/shadcn/project/src/components/ui/button.tsx", import.meta.url),
    );
    const context = await resolveTailwindProjectContext(buttonFilePath);

    assert.ok(context);
    assert.equal(
      context.componentsJsonPath,
      fileURLToPath(new URL("./test/shadcn/project/components.json", import.meta.url)),
    );
    assert.equal(
      context.tailwindCssEntryPath,
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
    );
    assert.ok(context.tailwindCssEntrySource.includes("@import \"tailwindcss\";"));
    assert.equal(context.componentsJson.tailwind?.css, "src/index.css");
    assert.equal(context.shadcn?.style, "base-vega");
    assert.equal(context.shadcn?.baseColor, "neutral");
    assert.equal(context.shadcn?.font, "inter");
    assert.equal(context.shadcn?.fontHeading, "inherit");
    assert.equal(context.shadcn?.preset?.name, "base-vega");
    assert.ok(context.shadcn?.defaultTailwindCssPath?.endsWith("shadcn\\dist\\tailwind.css"));
    assert.ok(context.shadcn?.defaultTailwindCssSource?.includes("@custom-variant data-open"));
    assert.ok(context.shadcn?.originalIndexCssSource?.includes("@import \"@fontsource-variable/inter\";"));
    assert.ok(context.shadcn?.originalIndexCssSource?.includes("@theme inline"));
  });

  it("fails softly when shadcn package metadata is unavailable", async () => {
    let tmpDir = "";

    try {
      tmpDir = await mkdtemp(join(tmpdir(), "unwind-context-"));
      await mkdir(join(tmpDir, "src"), { recursive: true });
      await writeFile(
        join(tmpDir, "components.json"),
        JSON.stringify({
          style: "base-vega",
          tailwind: {
            css: "src/index.css",
            baseColor: "neutral",
          },
        }, null, 2),
      );
      await writeFile(join(tmpDir, "src", "index.css"), "@import \"tailwindcss\";\n");
      await writeFile(join(tmpDir, "src", "button.tsx"), "export const x = 1;\n");

      const context = await resolveTailwindProjectContext(join(tmpDir, "src", "button.tsx"));

      assert.ok(context);
      assert.equal(context.tailwindCssEntrySource, "@import \"tailwindcss\";\n");
      assert.equal(context.shadcn?.style, "base-vega");
      assert.equal(context.shadcn?.baseColor, "neutral");
      assert.equal(context.shadcn?.font, "inter");
      assert.equal(context.shadcn?.fontHeading, "inherit");
      assert.equal(context.shadcn?.preset?.name, "base-vega");
      assert.equal(context.shadcn?.defaultTailwindCssPath, undefined);
      assert.equal(context.shadcn?.defaultTailwindCssSource, undefined);
      assert.equal(context.shadcn?.originalIndexCssSource, "@import \"tailwindcss\";\n");
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true });
      }
    }
  });
});

describe("resolveTailwindCssEntryPath", () => {
  let tmpDir = "";

  before(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "unwind-context-path-"));
    await mkdir(join(tmpDir, "src"), { recursive: true });
    await writeFile(
      join(tmpDir, "components.json"),
      JSON.stringify({
        tailwind: {
          css: "src/index.css",
        },
      }, null, 2),
    );
    await writeFile(join(tmpDir, "src", "index.css"), "@import \"tailwindcss\";\n");
    await writeFile(join(tmpDir, "src", "button.tsx"), "export const x = 1;\n");
  });

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns the resolved tailwind css entry file path", async () => {
    assert.equal(
      await resolveTailwindCssEntryPath(join(tmpDir, "src", "button.tsx")),
      join(tmpDir, "src", "index.css"),
    );
  });

  it("returns undefined when no project context exists", async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), "unwind-context-outside-"));

    assert.equal(
      await resolveTailwindCssEntryPath(join(outsideDir, "outside.tsx")),
      undefined,
    );

    await rm(outsideDir, { recursive: true, force: true });
  });
});
