import { describe, expect, it } from "vitest";
import { createTransformTargets } from "../targets.ts";

describe(createTransformTargets, () => {
  it("derives concise selector names from isolated class-name entries", () => {
    const targets = createTransformTargets([
      {
        source: "cva",
        value: "rounded-md border",
        breadcrumbs: [{ kind: "variable", name: "buttonVariants" }, { kind: "cva" }],
      },
      {
        source: "cva",
        value: "size-9",
        breadcrumbs: [
          { kind: "variable", name: "buttonVariants" },
          { kind: "cva" },
          { kind: "variants" },
          { kind: "variant", name: "size" },
          { kind: "classNames", name: "size" },
        ],
      },
      {
        source: "className",
        value: "block",
        breadcrumbs: [
          { kind: "function", name: "Card" },
          { kind: "className" },
          { kind: "condition", name: "isOpen" },
        ],
      },
      {
        source: "className",
        value: "hidden",
        breadcrumbs: [
          { kind: "function", name: "Card" },
          { kind: "className" },
          { kind: "condition", name: "isOpen" },
        ],
      },
    ]);

    expect(
      targets.map((target) => ({
        outputSelector: target.outputSelector,
        value: target.value,
      })),
    ).toEqual([
      { outputSelector: ".button", value: "rounded-md border" },
      { outputSelector: ".button-size", value: "size-9" },
      { outputSelector: ".card-open-block", value: "block" },
      { outputSelector: ".card-open-hidden", value: "hidden" },
    ]);
  });
});
