import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";

function expectBreadcrumbs(
  extracted: ReturnType<typeof extractClassNameStringsFromSource>,
  value: string,
) {
  const entry = extracted.find((candidate) => candidate.value === value);
  assert.ok(entry, `Expected to extract "${value}"`);
  return entry;
}

describe("extractClassNameStringsFromSource", () => {
  it("walks nested expression branches while preserving semantic breadcrumbs", () => {
    const source = `
      import { cva } from "class-variance-authority";

      const cardVariants = cva(
        ["base", isActive && "hover:bg-accent"],
        {
          variants: {
            size: {
              icon: ["size-9", isCompact ? "p-0" : "p-1"],
            },
          },
          compoundVariants: [{ className: "shadow-lg" }],
        }
      );

      function Card() {
        return <div className={isOpen ? "block" : "hidden"} />;
      }
    `;

    const extracted = extractClassNameStringsFromSource(source);
    const base = expectBreadcrumbs(extracted, "base");
    const hover = expectBreadcrumbs(extracted, "hover:bg-accent");
    const icon = expectBreadcrumbs(extracted, "size-9");
    const compound = expectBreadcrumbs(extracted, "shadow-lg");
    const block = expectBreadcrumbs(extracted, "block");
    const hidden = expectBreadcrumbs(extracted, "hidden");

    assert.deepEqual(base.breadcrumbs, [
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
    ]);

    assert.deepEqual(icon.breadcrumbs, [
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "variants" },
      { kind: "variant", name: "size" },
      { kind: "classNames", name: "icon" },
    ]);

    assert.deepEqual(hover.breadcrumbs, [
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "condition", name: "isActive" },
    ]);

    assert.deepEqual(compound.breadcrumbs, [
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "compoundVariants" },
      { kind: "classNames", name: "0" },
    ]);

    assert.equal(block.source, "className");
    assert.deepEqual(block.breadcrumbs, [
      { kind: "function", name: "Card" },
      { kind: "className" },
      { kind: "condition", name: "isOpen" },
    ]);

    assert.equal(hidden.source, "className");
    assert.deepEqual(hidden.breadcrumbs, [
      { kind: "function", name: "Card" },
      { kind: "className" },
      { kind: "condition", name: "isOpen" },
    ]);
  });
});
