import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  extractClassNameStringsFromFile,
  extractClassNameTokens,
} from "../../classname-extract.ts";

const buttonFilePath = fileURLToPath(
  new URL("./project/src/components/ui/button.tsx", import.meta.url),
);

describe("extractClassNameStringsFromFile", () => {
  it("finds shadcn button class strings from the fixture source", async () => {
    const extracted = await extractClassNameStringsFromFile(buttonFilePath);
    const values = extracted.map((entry) => entry.value);

    assert.ok(
      values.includes(
        "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      ),
    );
    assert.ok(values.includes("bg-primary text-primary-foreground hover:bg-primary/80"));
    assert.ok(
      values.includes(
        "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
      ),
    );
    assert.ok(values.includes("size-9"));
    assert.ok(values.includes("size-10"));

    assert.deepEqual(new Set(extracted.map((entry) => entry.source)), new Set(["cva"]));
  });

  it("captures breadcrumb metadata for common cva classes", async () => {
    const extracted = await extractClassNameStringsFromFile(buttonFilePath);
    const commonClasses = extracted.find((entry) =>
      entry.value.startsWith("group/button inline-flex shrink-0"),
    );

    assert.deepEqual(commonClasses?.breadcrumbs, [
      { kind: "variable", name: "buttonVariants" },
      { kind: "cva" },
    ]);
  });

  it("captures breadcrumb metadata for nested variant classes", async () => {
    const extracted = await extractClassNameStringsFromFile(buttonFilePath);
    const iconSize = extracted.find((entry) => entry.value === "size-9");

    assert.deepEqual(iconSize?.breadcrumbs, [
      { kind: "variable", name: "buttonVariants" },
      { kind: "cva" },
      { kind: "variants" },
      { kind: "variant", name: "size" },
      { kind: "classNames", name: "icon" },
    ]);
  });

  it("normalizes extracted class tokens and skips variant metadata", async () => {
    const extracted = await extractClassNameStringsFromFile(buttonFilePath);
    const tokens = extractClassNameTokens(extracted.map((entry) => entry.value));

    assert.ok(tokens.includes("group/button"));
    assert.ok(tokens.includes("focus-visible:ring-3"));
    assert.ok(tokens.includes("rounded-[min(var(--radius-md),10px)]"));
    assert.ok(tokens.includes("[&_svg]:pointer-events-none"));
    assert.ok(tokens.includes("hover:underline"));

    assert.ok(!tokens.includes("default"));
    assert.ok(!tokens.includes("outline"));
    assert.ok(!tokens.includes("secondary"));
  });
});
