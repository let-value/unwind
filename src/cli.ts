#!/usr/bin/env node
import { parseArgs } from "node:util";
import { glob, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, dirname, join, sep } from "node:path";
import { transform } from "./transform.ts";
import { resolveShadcnProject } from "./shadcn.ts";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dry: {
      type: "boolean",
      short: "d",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
    output: {
      type: "string",
      short: "o",
    },
    css: {
      type: "string",
    },
    "import-name": {
      type: "string",
    },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(
    [
      "unwind — compile Tailwind CSS classes into CSS modules",
      "",
      "Usage:",
      "  unwind [glob...]           transform files matching glob pattern(s)",
      "  unwind                     auto-detect shadcn project and transform ui components",
      "",
      "Options:",
      "  -o, --output <dir>         write output to directory (default: in-place)",
      "  --css <path>               Tailwind CSS entry file (auto-detected from shadcn if not provided)",
      "  --import-name <name>       CSS module import identifier (default: styles)",
      "  -d, --dry                  print what would be written without writing",
      "  -h, --help                 show this help",
    ].join("\n"),
  );
  process.exit(0);
}

const importName = values["import-name"] ?? "styles";
const outputDir = values.output ? resolve(values.output) : undefined;
const dry = values.dry;

// --- File discovery & CSS context ---
let inputFiles: string[] = [];
let css: string | undefined;
let base: string | undefined;

if (positionals.length > 0) {
  const cwd = process.cwd();
  const results = await Promise.all(
    positionals.map((pattern) => Array.fromAsync(glob(pattern, { cwd }))),
  );
  inputFiles = results.flat().map((f) => resolve(cwd, f));
  // Derive CSS context from shadcn when no explicit --css provided
  if (!values.css) {
    const metadata = await resolveShadcnProject(cwd);
    if (metadata) {
      css = metadata.css;
      base = metadata.base;
    }
  }
} else {
  const metadata = await resolveShadcnProject(process.cwd());
  if (!metadata) {
    console.error(
      "No glob pattern provided and no shadcn project found (components.json not found).",
    );
    process.exit(1);
  }
  css = metadata.css;
  base = metadata.base;
  const searchDir = metadata.uiPath ?? metadata.componentsPath;
  inputFiles = (await Array.fromAsync(glob("**/*.{tsx,ts,jsx,js}", { cwd: searchDir }))).map((f) =>
    resolve(searchDir, f),
  );
}

// --css flag content overrides auto-detected CSS
if (values.css) {
  css = await readFile(resolve(values.css), "utf-8");
}

if (inputFiles.length === 0) {
  console.error("No input files found.");
  process.exit(1);
}

// --- Common ancestor for output directory mirroring ---
function commonAncestor(paths: string[]): string {
  if (paths.length === 1) return dirname(paths[0]);
  const parts = paths.map((p) => p.split(sep));
  const minLen = Math.min(...parts.map((p) => p.length - 1));
  let i = 0;
  while (i < minLen && parts.every((p) => p[i] === parts[0][i])) i++;
  return parts[0].slice(0, i).join(sep) || sep;
}

const fileBase = outputDir ? commonAncestor(inputFiles) : undefined;

// --- Transform loop ---
let successCount = 0;
let failCount = 0;

for (const filePath of inputFiles) {
  try {
    const result = await transform({ path: filePath, css, base, importName });

    let sourceDest: string;
    let cssDest: string;

    if (outputDir && fileBase) {
      sourceDest = join(outputDir, relative(fileBase, filePath));
      cssDest = join(outputDir, relative(fileBase, result.cssModulePath));
    } else {
      sourceDest = filePath;
      cssDest = result.cssModulePath;
    }

    const sourceContent = result.root.toSource();
    const localCss = result.local.toString();
    const globalCss = result.global.toString();
    const globalDest = cssDest.replace(/\.module\.css$/, ".global.css");

    if (dry) {
      console.log(`  write: ${sourceDest}`);
      console.log(`  write: ${cssDest}`);
      if (globalCss) console.log(`  write: ${globalDest}`);
    } else {
      await mkdir(dirname(sourceDest), { recursive: true });
      await writeFile(sourceDest, sourceContent, "utf-8");
      await mkdir(dirname(cssDest), { recursive: true });
      await writeFile(cssDest, localCss, "utf-8");
      if (globalCss) await writeFile(globalDest, globalCss, "utf-8");
    }

    successCount++;
  } catch (err) {
    console.error(`Error transforming ${filePath}:`, err);
    failCount++;
  }
}

console.log(
  `\n${dry ? "[dry run] " : ""}${successCount} file(s) transformed${failCount > 0 ? `, ${failCount} failed` : ""}.`,
);

if (failCount > 0) {
  process.exit(1);
}
