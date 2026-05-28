import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { createPreservedCssComment } from "../preserve-css.ts";
import { createShadcnFallbackCss, resolveShadcnProject } from "../shadcn.ts";

const path = fileURLToPath(new URL("./shadcn/project/components.json", import.meta.url));
const packageJsonPath = fileURLToPath(new URL("./shadcn/project/package.json", import.meta.url));
const cssPath = fileURLToPath(new URL("./shadcn/project/src/index.css", import.meta.url));
const compiledCssPath = fileURLToPath(new URL("./shadcn/compiled/globals.css", import.meta.url));
const componentsPath = fileURLToPath(new URL("./shadcn/project/src/components", import.meta.url));
const uiPath = fileURLToPath(new URL("./shadcn/project/src/components/ui", import.meta.url));

test("reads the configured index.css source from components.json", async () => {
  const source = await resolveShadcnProject(path);
  const css = await readFile(cssPath, "utf8");

  expect(source).toMatchObject({
    packageJsonPath,
    cssPath,
    css,
    cssIsCompiled: false,
    componentsPath,
    uiPath,
  });
});

test("creates a Tailwind source fallback from compiled shadcn CSS metadata", async () => {
  const fallback = createShadcnFallbackCss(await readFile(compiledCssPath, "utf8"));

  expect(fallback).toContain('@import "tailwindcss"');
  expect(fallback).toContain('@import "tw-animate-css"');
  expect(fallback).toContain('@import "shadcn/tailwind.css"');
  expect(fallback).toContain('@import "@fontsource-variable/inter"');
  expect(fallback).toContain("--color-muted: var(--muted)");
  expect(fallback).toContain("/*! tailwindcss");
});

test("preserves source CSS nodes missing from compiled CSS comments", () => {
  const compiledCss = [":root {", "  --muted: oklch(0.97 0 0);", "}"].join("\n");
  const authoredCss = [
    '@import "tailwindcss";',
    '@import "tw-animate-css";',
    '@import "shadcn/tailwind.css";',
    '@import "@fontsource-variable/inter";',
    "",
    "@theme inline {",
    "  --color-muted: var(--muted);",
    "}",
  ].join("\n");
  const fallback = createShadcnFallbackCss(
    [createPreservedCssComment(authoredCss, compiledCss), compiledCss].filter(Boolean).join("\n"),
  );

  expect(fallback).toContain('@import "tailwindcss";');
  expect(fallback).toContain('@import "tw-animate-css";');
  expect(fallback).toContain('@import "shadcn/tailwind.css";');
  expect(fallback).toContain('@import "@fontsource-variable/inter";');
  expect(fallback).toContain("--color-muted: var(--muted)");
  expect(fallback).toContain("--muted: oklch(0.97 0 0)");
});

test("preserved source CSS comments are idempotent across compiled output", () => {
  const sourceCss = [
    '@import "tailwindcss";',
    "@theme inline {",
    "  --color-muted: var(--muted);",
    "}",
    ":root {",
    "  --muted: oklch(0.97 0 0);",
    "}",
  ].join("\n");
  const compiledCss = [":root {", "  --muted: oklch(0.97 0 0);", "}"].join("\n");
  const firstOutput = [createPreservedCssComment(sourceCss, compiledCss), compiledCss]
    .filter(Boolean)
    .join("\n");
  const effectiveSourceCss = createShadcnFallbackCss(firstOutput);
  const secondOutput = [createPreservedCssComment(effectiveSourceCss ?? "", compiledCss), compiledCss]
    .filter(Boolean)
    .join("\n");

  expect(secondOutput).toBe(firstOutput);
});
