import { fileURLToPath } from "node:url";
import { expect, test, describe } from "vitest";

import { transform } from "../transform.ts";
import { resolveShadcnProject } from "../shadcn.ts";

const path = fileURLToPath(
  new URL("./shadcn/project/src/components/ui/button.tsx", import.meta.url),
);

describe("className JSX attribute", () => {
  test("replaces a plain className string with a CSS module reference", async () => {
    const source = `export function Foo() { return <div className="p-4 text-sm" />; }`;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`styles["foo"]`);
    expect(result).not.toContain(`"p-4 text-sm"`);
    expect(result).toContain(`import styles from "./Button.module.css"`);
  });

  test("wraps the replacement in a JSX expression container", async () => {
    const source = `export function Foo() { return <div className="p-4" />; }`;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`className={styles["foo"]}`);
  });

  test("replaces className with JSX expression container string", async () => {
    const source = `export function Foo() { return <div className={"p-4"} />; }`;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`className={styles["foo"]}`);
    expect(result).not.toContain(`"p-4"`);
  });

  test("replaces className with JSX expression container template literal", async () => {
    const source = "export function Foo() { return <div className={`p-4`} />; }";
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`className={styles["foo"]}`);
    expect(result).not.toContain("`p-4`");
  });

  test("replaces className on multiple sibling elements independently", async () => {
    const source = `
      export function Card() {
        return (
          <div className="p-4">
            <span className="text-sm text-gray-500">label</span>
          </div>
        );
      }
    `;
    const result = await transform({ source, path: "/project/src/Card.tsx" });

    expect(result).toContain(`className={styles["`);

    expect(result).not.toContain(`"p-4"`);
    expect(result).not.toContain(`"text-sm text-gray-500"`);

    expect(result).toContain(`>label<`);
  });

  test("does not touch non-className JSX attribute strings", async () => {
    const source = `
      export function Icon() {
        return <svg className="size-4 shrink-0" aria-label="close icon" role="img" />;
      }
    `;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`aria-label="close icon"`);
    expect(result).toContain(`role="img"`);
    expect(result).not.toContain(`"size-4 shrink-0"`);
  });

  test("does not touch unrelated string literals", async () => {
    const source = `
      const msg = "hello world";
      export function Foo() { return <div className="p-4" aria-label="button" />; }
    `;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`"hello world"`);
    expect(result).toContain(`"button"`);
    expect(result).not.toContain(`"p-4"`);
  });
});

describe("cva arguments", () => {
  test("replaces cva base string with CSS module reference", async () => {
    const source = `
      import { cva } from "class-variance-authority";
      const buttonVariants = cva("bg-primary text-white");
    `;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`styles["button"]`);
    expect(result).not.toContain(`"bg-primary text-white"`);
  });

  test("replaces variant class strings with CSS module references", async () => {
    const source = `
      import { cva } from "class-variance-authority";
      const buttonVariants = cva("base-class", {
        variants: {
          size: {
            sm: "text-sm",
            lg: "text-lg",
          },
        },
      });
    `;
    const result = await transform({ source, path: "/project/src/Button.tsx" });

    expect(result).toContain(`styles["button-size-sm"]`);
    expect(result).toContain(`styles["button-size-lg"]`);
    expect(result).not.toContain(`"text-sm"`);
    expect(result).not.toContain(`"text-lg"`);
  });
});

describe("CSS module import injection", () => {
  test("inserts import before the first existing import", async () => {
    const source = `
      import React from "react";
      export function Foo() { return <div className="p-4" />; }
    `;
    const { root } = await transform({ source, path: "/project/src/Button.tsx" });

    const result = root.toSource();

    const stylesPos = result.indexOf(`import styles from`);
    const reactPos = result.indexOf(`import React from`);
    expect(stylesPos).toBeLessThan(reactPos);
  });

  test("does not duplicate import on result source", async () => {
    const source = `export function Foo() { return <div className="p-4" />; }`;
    const { root } = await transform({ source, path: "/project/src/Button.tsx" });
    const result = root.toSource();
    const occurrences = (result.match(/import styles from/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  test("uses a custom import name when provided", async () => {
    const source = `export function Foo() { return <div className="p-4" />; }`;

    const { root } = await transform({
      source,
      path: "/project/src/Button.tsx",
      importName: "css",
    });

    const result = root.toSource();

    expect(result).toContain(`import css from`);
    expect(result).toContain(`css["foo"]`);
  });
});

test("transforms shadcn button fixture — all 15 targets replaced", async () => {
  const project = await resolveShadcnProject(path);

  expect(project).toBeDefined();

  const { root, global, local } = await transform({
    path,
    ...project,
  });

  const result = root.toSource();

  expect(result).toContain(`import styles from "./button.module.css"`);

  const expectedKeys = [
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
  ];

  for (const key of expectedKeys) {
    expect(result).toContain(`styles["${key}"]`);
  }

  expect(result).not.toContain(`"bg-primary text-primary-foreground hover:bg-primary/80"`);
  expect(result).not.toContain(`"size-9"`);
  expect(result).not.toContain(`"size-10"`);

  expect(result).toMatchSnapshot();
  expect(global.toString()).toMatchSnapshot();
  expect(local.toString()).toMatchSnapshot();
});
