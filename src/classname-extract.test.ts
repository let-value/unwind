import { describe, expect, it } from "vitest";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";

function expectBreadcrumbs(
  extracted: ReturnType<typeof extractClassNameStringsFromSource>,
  value: string,
) {
  const entry = extracted.find((candidate) => candidate.value === value);
  expect(entry).toBeDefined();
  return entry!;
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

    expect(base.breadcrumbs).toEqual([
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
    ]);

    expect(icon.breadcrumbs).toEqual([
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "variants" },
      { kind: "variant", name: "size" },
      { kind: "classNames", name: "icon" },
    ]);

    expect(hover.breadcrumbs).toEqual([
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "condition", name: "isActive" },
    ]);

    expect(compound.breadcrumbs).toEqual([
      { kind: "variable", name: "cardVariants" },
      { kind: "cva" },
      { kind: "compoundVariants" },
      { kind: "classNames", name: "0" },
    ]);

    expect(block.source).toBe("className");
    expect(block.breadcrumbs).toEqual([
      { kind: "function", name: "Card" },
      { kind: "className" },
      { kind: "condition", name: "isOpen" },
    ]);

    expect(hidden.source).toBe("className");
    expect(hidden.breadcrumbs).toEqual([
      { kind: "function", name: "Card" },
      { kind: "className" },
      { kind: "condition", name: "isOpen" },
    ]);
  });
});
