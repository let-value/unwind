import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  resolveOriginalShadcnIndexCssFromComponentsJsonPath,
  resolveShadcnProjectMetadata,
} from "./shadcn-strategy.ts";

describe("resolveOriginalShadcnIndexCssFromComponentsJsonPath", () => {
  const componentsJsonPath = fileURLToPath(
    new URL("./test/shadcn/project/components.json", import.meta.url),
  );
  const fixtureIndexCssPath = fileURLToPath(
    new URL("./test/shadcn/project/src/index.css", import.meta.url),
  );

  it("reads the configured index.css source from components.json", async () => {
    const source = await resolveOriginalShadcnIndexCssFromComponentsJsonPath(componentsJsonPath);
    const fixtureSource = await readFile(fixtureIndexCssPath, "utf8");

    expect(source).toBeDefined();
    expect(source).toBe(fixtureSource);
  });

  it("snapshots the resolved index.css alongside the fixture source", async () => {
    const resolvedSource = await resolveOriginalShadcnIndexCssFromComponentsJsonPath(
      componentsJsonPath,
    );
    const fixtureSource = await readFile(fixtureIndexCssPath, "utf8");

    expect(resolvedSource).toBeDefined();
    expect(resolvedSource).toBe(fixtureSource);
    expect(resolvedSource).toMatchSnapshot();
  });
});

describe("resolveShadcnProjectMetadata", () => {
  it("collects shadcn preset metadata and the configured index css for the fixture project", async () => {
    const projectRoot = fileURLToPath(new URL("./test/shadcn/project", import.meta.url));
    const fixtureSource = await readFile(
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
      "utf8",
    );
    const metadata = await resolveShadcnProjectMetadata(projectRoot, {
      style: "base-vega",
      iconLibrary: "lucide",
      tailwind: {
        css: "src/index.css",
        baseColor: "neutral",
      },
    });

    expect(metadata).toBeDefined();
    expect(metadata.style).toBe("base-vega");
    expect(metadata.baseColor).toBe("neutral");
    expect(metadata.iconLibrary).toBe("lucide");
    expect(metadata.font).toBe("inter");
    expect(metadata.fontHeading).toBe("inherit");
    expect(metadata.preset?.name).toBe("base-vega");
    expect(metadata.defaultTailwindCssPath?.endsWith("shadcn\\dist\\tailwind.css")).toBe(true);
    expect(metadata.defaultTailwindCssSource?.includes("@custom-variant data-open")).toBe(true);
    expect(metadata.originalIndexCssSource).toBe(fixtureSource);
  });
});
