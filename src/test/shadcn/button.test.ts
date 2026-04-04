import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { getFileClassNames, extractClassNameTokens } from "../../classnames.ts";
import { compileTailwindTargets } from "../../compile.ts";
import { resolveTailwindProjectContext } from "../../tailwind-context.ts";
import { createTransformTargets } from "../../transform-targets.ts";

const path = fileURLToPath(new URL("./project/src/components/ui/button.tsx", import.meta.url));

test("finds shadcn button class strings from the fixture source", async () => {
  const extracted = await getFileClassNames(path);
  const values = extracted.map((entry) => entry.value);

  expect(values).toContain(
    "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  );
  expect(values).toContain("bg-primary text-primary-foreground hover:bg-primary/80");
  expect(values).toContain(
    "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  );
  expect(values).toContain("size-9");
  expect(values).toContain("size-10");
  expect(new Set(extracted.map((entry) => entry.source))).toEqual(new Set(["cva"]));
});

test("captures breadcrumb metadata for common cva classes", async () => {
  const extracted = await getFileClassNames(path);
  const commonClasses = extracted.find((entry) =>
    entry.value.startsWith("group/button inline-flex shrink-0"),
  );

  expect(commonClasses?.breadcrumbs).toEqual([
    { kind: "variable", name: "buttonVariants" },
    { kind: "cva" },
  ]);
});

test("captures breadcrumb metadata for nested variant classes", async () => {
  const extracted = await getFileClassNames(path);
  const iconSize = extracted.find((entry) => entry.value === "size-9");

  expect(iconSize?.breadcrumbs).toEqual([
    { kind: "variable", name: "buttonVariants" },
    { kind: "cva" },
    { kind: "variants" },
    { kind: "variant", name: "size" },
    { kind: "classNames", name: "icon" },
  ]);
});

test("normalizes extracted class tokens and skips variant metadata", async () => {
  const extracted = await getFileClassNames(path);
  const tokens = extractClassNameTokens(extracted.map((entry) => entry.value));

  expect(tokens).toContain("group/button");
  expect(tokens).toContain("focus-visible:ring-3");
  expect(tokens).toContain("rounded-[min(var(--radius-md),10px)]");
  expect(tokens).toContain("[&_svg]:pointer-events-none");
  expect(tokens).toContain("hover:underline");
  expect(tokens).not.toContain("default");
  expect(tokens).not.toContain("outline");
  expect(tokens).not.toContain("secondary");
});

test("generates stable transform targets for the shadcn button fixture", async () => {
  const extracted = await getFileClassNames(path);
  const targets = createTransformTargets(extracted);

  expect(targets.map((target) => target.selectorName)).toEqual([
    "button",
    "button-variant-default",
    "button-variant-outline",
    "button-variant-secondary",
    "button-variant-ghost",
    "button-variant-destructive",
    "button-variant-link",
    "button-size-default",
    "button-size-xs",
    "button-size-sm",
    "button-size-lg",
    "button-size-icon",
    "button-size-icon-xs",
    "button-size-icon-sm",
    "button-size-icon-lg",
  ]);
});

test("keeps button target selectors aligned with the extracted class strings", async () => {
  const extracted = await getFileClassNames(path);
  const targets = createTransformTargets(extracted);
  const targetBySelector = new Map(
    targets.map((target) => [target.selectorName, target.classNames]),
  );

  expect(targetBySelector.get("button")).toBe(
    "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  );
  expect(targetBySelector.get("button-variant-outline")).toBe(
    "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  );
  expect(targetBySelector.get("button-size-icon")).toBe("size-9");
  expect(targetBySelector.get("button-size-icon-lg")).toBe("size-10");
});

test("compiles button fixture into local and hoisted global css", async () => {
  const extracted = await getFileClassNames(path);
  const targets = createTransformTargets(extracted);
  const context = await resolveTailwindProjectContext(path);

  expect(context).toBeDefined();

  const result = await compileTailwindTargets(targets, {
    context: context!,
  });

  expect(result.localCss).toContain(".button");
  expect(result.localCss).toContain(".button-variant-default");
  expect(result.localCss).toContain(".button-size-icon-lg");
  expect(result.localCss).toContain(":global(.dark)");
  expect(result.localCss).not.toContain(":root");
  expect(result.globalCss).toContain(":root");
  expect(result.globalCss).toContain(".dark");
  expect(result.globalCss).toContain("@font-face");
  expect(result.globalCss).not.toContain(".button-variant-default");
  expect(result.localCss).not.toContain("{}");
  expect(result.globalCss).not.toContain("{}");
  expect(result.localCss).toMatchSnapshot();
  expect(result.globalCss).toMatchSnapshot();
});
