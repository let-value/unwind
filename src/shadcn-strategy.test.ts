import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  resolveOriginalShadcnIndexCssFromComponentsJsonPath,
  resolveShadcnProjectMetadata,
} from "./shadcn-strategy.ts";

function snapshotCss(css: string): string[] {
  return css.split("\n");
}

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

    assert.ok(source);
    assert.equal(source, fixtureSource);
  });

  it("snapshots the resolved index.css alongside the fixture source", async (t) => {
    const resolvedSource = await resolveOriginalShadcnIndexCssFromComponentsJsonPath(componentsJsonPath);
    const fixtureSource = await readFile(fixtureIndexCssPath, "utf8");

    assert.ok(resolvedSource);
    assert.equal(resolvedSource, fixtureSource);

    t.assert.snapshot(snapshotCss(resolvedSource));
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

    assert.ok(metadata);
    assert.equal(metadata.style, "base-vega");
    assert.equal(metadata.baseColor, "neutral");
    assert.equal(metadata.iconLibrary, "lucide");
    assert.equal(metadata.font, "inter");
    assert.equal(metadata.fontHeading, "inherit");
    assert.equal(metadata.preset?.name, "base-vega");
    assert.ok(metadata.defaultTailwindCssPath?.endsWith("shadcn\\dist\\tailwind.css"));
    assert.ok(metadata.defaultTailwindCssSource?.includes("@custom-variant data-open"));
    assert.equal(metadata.originalIndexCssSource, fixtureSource);
  });
});
