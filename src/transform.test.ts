import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import jscodeshift from "jscodeshift";
import { describe, expect, it } from "vitest";
import { getSourceClassNames } from "./classnames.ts";
import { createTransformTargets } from "./targets.ts";
import {
  deriveTargetCssModulePath,
  resolveTailwindCssEntryPath,
  resolveTailwindProjectContext,
  transform,
} from "./transform.ts";

describe("deriveTargetCssModulePath", () => {
  it("derives a css module file path next to a tsx source file", () => {
    expect(
      deriveTargetCssModulePath("src\\test\\shadcn\\project\\src\\components\\ui\\button.tsx"),
    ).toBe("src\\test\\shadcn\\project\\src\\components\\ui\\button.module.css");
  });

  it("derives a css module file path for relative source paths", () => {
    expect(deriveTargetCssModulePath("components/button.tsx")).toBe(
      "components\\button.module.css",
    );
  });
});

describe("resolveTailwindCssEntryPath", () => {
  it("finds the shadcn fixture css entry from a component file path", async () => {
    expect(
      await resolveTailwindCssEntryPath(
        "src\\test\\shadcn\\project\\src\\components\\ui\\button.tsx",
      ),
    ).toBe(fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)));
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

    const classNames = getSourceClassNames(source);
    const targets = createTransformTargets(classNames);

    expect(targets.map((target) => target.selectorName)).toEqual([
      "card",
      "card-size-icon",
      "card-open-block",
      "card-open-hidden",
    ]);

    const api = {
      j: jscodeshift.withParser("tsx"),
      jscodeshift: jscodeshift.withParser("tsx"),
      stats: () => {},
      report: () => {},
    };

    const result = await transform({ path: "card.tsx", source }, api);

    expect(result).toBeTruthy();
    expect(result.context).toBeUndefined();
    expect(result.cssModulePath).toBe("card.module.css");
    expect(result.localCss).toContain(".card");
    expect(result.localCss).toContain(".card-size-icon");
    expect(result.localCss).toContain(".card-open-block");
    expect(result.localCss).toContain(".card-open-hidden");
    expect(result.localCss).toContain("border-radius:");
    expect(result.localCss).toContain("display: block");
    expect(result.localCss).toContain("display: none");
    expect(result.globalCss).toBe("");
  });

  it("uses the project css entry to compile shadcn theme utilities and hoisted globals", async () => {
    const buttonFilePath = fileURLToPath(
      new URL("./test/shadcn/project/src/components/ui/button.tsx", import.meta.url),
    );
    const source = await readFile(buttonFilePath, "utf8");
    const api = {
      j: jscodeshift.withParser("tsx"),
      jscodeshift: jscodeshift.withParser("tsx"),
      stats: () => {},
      report: () => {},
    };

    const result = await transform({ path: buttonFilePath, source }, api);

    expect(result).toBeTruthy();
    expect(result.context).toBeDefined();
    expect(result.context?.tailwindCssEntryPath).toBe(
      fileURLToPath(new URL("./test/shadcn/project/src/index.css", import.meta.url)),
    );
    expect(result.localCss).toContain(".button-variant-default");
    expect(result.localCss).toContain("background-color: var(--primary);");
    expect(result.localCss).toContain("color: var(--primary-foreground);");
    expect(result.localCss).toContain(".button-variant-secondary");
    expect(result.localCss).toContain("background-color: var(--secondary);");
    expect(result.globalCss).toContain(":root");
    expect(result.globalCss).toContain(".dark");
    expect(result.globalCss).toContain("@font-face");
    expect(result.globalCss).not.toContain(".button-variant-default");
  });

  it("resolves full project context from the file path during transform", async () => {
    const buttonFilePath = fileURLToPath(
      new URL("./test/shadcn/project/src/components/ui/button.tsx", import.meta.url),
    );
    const context = await resolveTailwindProjectContext(buttonFilePath);

    expect(context).toBeDefined();
    expect(context!.projectRoot).toBe(
      fileURLToPath(new URL("./test/shadcn/project", import.meta.url)),
    );
    expect(context!.componentsJson.tailwind?.css).toBe("src/index.css");
  });
});
