import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

    expect(context).toBeDefined();
    expect(context!.componentsJsonPath).toBe(
      fileURLToPath(new URL("./test/shadcn/project/components.json", import.meta.url)),
    );
    expect(context!.tailwindCssEntryPath).toBe(
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
    );
    expect(context!.tailwindCssEntrySource).toContain("@import \"tailwindcss\";");
    expect(context!.componentsJson.tailwind?.css).toBe("src/index.css");
    expect(context!.shadcn?.style).toBe("base-vega");
    expect(context!.shadcn?.baseColor).toBe("neutral");
    expect(context!.shadcn?.font).toBe("inter");
    expect(context!.shadcn?.fontHeading).toBe("inherit");
    expect(context!.shadcn?.preset?.name).toBe("base-vega");
    expect(context!.shadcn?.defaultTailwindCssPath?.endsWith("shadcn\\dist\\tailwind.css")).toBe(
      true,
    );
    expect(context!.shadcn?.defaultTailwindCssSource?.includes("@custom-variant data-open")).toBe(
      true,
    );
    expect(context!.shadcn?.originalIndexCssSource).toContain(
      "@import \"@fontsource-variable/inter\";",
    );
    expect(context!.shadcn?.originalIndexCssSource).toContain("@theme inline");
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

      expect(context).toBeDefined();
      expect(context!.tailwindCssEntrySource).toBe("@import \"tailwindcss\";\n");
      expect(context!.shadcn?.style).toBe("base-vega");
      expect(context!.shadcn?.baseColor).toBe("neutral");
      expect(context!.shadcn?.font).toBe("inter");
      expect(context!.shadcn?.fontHeading).toBe("inherit");
      expect(context!.shadcn?.preset?.name).toBe("base-vega");
      expect(context!.shadcn?.defaultTailwindCssPath).toBeUndefined();
      expect(context!.shadcn?.defaultTailwindCssSource).toBeUndefined();
      expect(context!.shadcn?.originalIndexCssSource).toBe("@import \"tailwindcss\";\n");
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true });
      }
    }
  });
});

describe("resolveTailwindCssEntryPath", () => {
  let tmpDir = "";

  beforeAll(async () => {
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

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns the resolved tailwind css entry file path", async () => {
    expect(await resolveTailwindCssEntryPath(join(tmpDir, "src", "button.tsx"))).toBe(
      join(tmpDir, "src", "index.css"),
    );
  });

  it("returns undefined when no project context exists", async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), "unwind-context-outside-"));

    expect(await resolveTailwindCssEntryPath(join(outsideDir, "outside.tsx"))).toBeUndefined();

    await rm(outsideDir, { recursive: true, force: true });
  });
});
