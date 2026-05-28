import { describe, expect, it, test } from "vitest";
import { getCssModulePath, getSourceClassNames, type ExtractedClassName } from "../classnames.ts";

function expectBreadcrumbs(extracted: ExtractedClassName[], value: string) {
  const entry = extracted.find((candidate) => candidate.classNames === value);
  expect(entry).toBeDefined();
  return entry!;
}

test("walks nested expression branches while preserving semantic breadcrumbs", async () => {
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

  const extracted = getSourceClassNames(source);
  const base = expectBreadcrumbs(extracted, "base");
  const hover = expectBreadcrumbs(extracted, "hover:bg-accent");
  const icon = expectBreadcrumbs(extracted, "size-9");
  const compound = expectBreadcrumbs(extracted, "shadow-lg");
  const block = expectBreadcrumbs(extracted, "block");
  const hidden = expectBreadcrumbs(extracted, "hidden");

  expect(base.breadcrumbs).toEqual([{ kind: "variable", name: "cardVariants" }, { kind: "cva" }]);

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

test("extracts repeated className string literals as distinct targets", () => {
  const source = `
    function Icons() {
      return (
        <div>
          <span className="size-4" />
          <span className="size-4" />
          <span className="size-4" />
        </div>
      );
    }
  `;

  const extracted = getSourceClassNames(source).filter((entry) => entry.classNames === "size-4");

  expect(extracted).toHaveLength(3);
  expect(new Set(extracted.map((entry) => entry.node)).size).toBe(3);
});

test("adds object property breadcrumbs for nested JSX className values", () => {
  const source = `
    function Toaster() {
      return (
        <Sonner
          icons={{
            success: <CircleCheckIcon className="size-4" />,
            info: <InfoIcon className="size-4" />,
          }}
        />
      );
    }
  `;

  const extracted = getSourceClassNames(source).filter((entry) => entry.classNames === "size-4");

  expect(extracted.map((entry) => entry.breadcrumbs)).toEqual([
    [
      { kind: "function", name: "Toaster" },
      { kind: "property", name: "success" },
      { kind: "className" },
    ],
    [
      { kind: "function", name: "Toaster" },
      { kind: "property", name: "info" },
      { kind: "className" },
    ],
  ]);
});

describe(getCssModulePath, () => {
  it("derives a css module file path next to a tsx source file", () => {
    expect(getCssModulePath("src\\test\\shadcn\\project\\src\\components\\ui\\button.tsx")).toBe(
      "src\\test\\shadcn\\project\\src\\components\\ui\\button.module.css",
    );
  });

  it("derives a css module file path for relative source paths", () => {
    expect(getCssModulePath("components/button.tsx")).toBe("components\\button.module.css");
  });
});
