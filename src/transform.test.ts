import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import jscodeshift from "jscodeshift";
import { describe, it } from "node:test";
import { createTransformTargets } from "./transform-targets.ts";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";
import {
  deriveTargetCssModulePath,
  resolveTailwindCssEntryPath,
  resolveTailwindProjectContext,
  transform,
} from "./transform.ts";

describe("deriveTargetCssModulePath", () => {
  it("derives a css module file path next to a tsx source file", () => {
    assert.equal(
      deriveTargetCssModulePath("src\\test\\shadcn\\project\\src\\components\\ui\\button.tsx"),
      "src\\test\\shadcn\\project\\src\\components\\ui\\button.module.css",
    );
  });

  it("derives a css module file path for relative source paths", () => {
    assert.equal(
      deriveTargetCssModulePath("components/button.tsx"),
      "components\\button.module.css",
    );
  });
});

describe("resolveTailwindCssEntryPath", () => {
  it("finds the shadcn fixture css entry from a component file path", async () => {
    assert.equal(
      await resolveTailwindCssEntryPath(
        "src\\test\\shadcn\\project\\src\\components\\ui\\button.tsx",
      ),
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
    );
  });
});

describe("transform", () => {
  it("extracts classes, assigns selectors, and compiles local css without project context", async () => {
    const source = `
      import { cva } from "class-variance-authority";

      const cardVariants = cva("rounded-md border", {
        variants: {
          size: {
            icon: "size-9",
          },
        },
      });

      function Card() {
        return <div className={isOpen ? "block" : "hidden"} />;
      }
    `;

    const classNames = extractClassNameStringsFromSource(source);
    const targets = createTransformTargets(classNames);

    assert.deepEqual(
      targets.map((target) => target.selectorName),
      ["card", "card-size-icon", "card-open-block", "card-open-hidden"],
    );

    const api = {
      j: jscodeshift.withParser("tsx"),
      jscodeshift: jscodeshift.withParser("tsx"),
      stats: () => { },
      report: () => { },
    };

    const result = await transform({ path: "card.tsx", source }, api);

    assert.ok(result);
    assert.equal(result.context, undefined);
    assert.equal(result.cssModulePath, "card.module.css");
    assert.ok(result.localCss.includes(".card"));
    assert.ok(result.localCss.includes(".card-size-icon"));
    assert.ok(result.localCss.includes(".card-open-block"));
    assert.ok(result.localCss.includes(".card-open-hidden"));
    assert.ok(result.localCss.includes("border-radius:"));
    assert.ok(result.localCss.includes("display: block"));
    assert.ok(result.localCss.includes("display: none"));
    assert.equal(result.globalCss, "");
  });

  it("uses the project css entry to compile shadcn theme utilities and hoisted globals", async () => {
    const buttonFilePath = fileURLToPath(
      new URL("./test/shadcn/project/src/components/ui/button.tsx", import.meta.url),
    );
    const source = await readFile(buttonFilePath, "utf8");
    const api = {
      j: jscodeshift.withParser("tsx"),
      jscodeshift: jscodeshift.withParser("tsx"),
      stats: () => { },
      report: () => { },
    };

    const result = await transform({ path: buttonFilePath, source }, api);

    assert.ok(result);
    assert.ok(result.context);
    assert.equal(
      result.context?.tailwindCssEntryPath,
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
    );
    assert.ok(result.localCss.includes(".button-variant-default"));
    assert.ok(result.localCss.includes("background-color: var(--primary);"));
    assert.ok(result.localCss.includes("color: var(--primary-foreground);"));
    assert.ok(result.localCss.includes(".button-variant-secondary"));
    assert.ok(result.localCss.includes("background-color: var(--secondary);"));
    assert.ok(result.globalCss.includes(":root"));
    assert.ok(result.globalCss.includes(".dark"));
    assert.ok(result.globalCss.includes("@font-face"));
    assert.ok(!result.globalCss.includes(".button-variant-default"));
  });

  it("resolves full project context from the file path during transform", async () => {
    const buttonFilePath = fileURLToPath(
      new URL("./test/shadcn/project/src/components/ui/button.tsx", import.meta.url),
    );
    const context = await resolveTailwindProjectContext(buttonFilePath);

    assert.ok(context);
    assert.equal(
      context.projectRoot,
      fileURLToPath(new URL("./test/shadcn/project", import.meta.url)),
    );
    assert.equal(context.componentsJson.tailwind?.css, "src/index.css");
  });
});
