#!/usr/bin/env node
import { parseArgs } from "node:util";
import { glob, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, dirname, join, sep } from "node:path";
import postcss, { type Root } from "postcss";
import { mergeGlobalRoots, mergeLocalRoots } from "./compile.ts";
import { resolveShadcnProject } from "./shadcn.ts";
import { transform } from "./transform.ts";

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
      "unwind - compile Tailwind CSS classes into CSS modules",
      "",
      "Usage:",
      "  unwind [glob...]           transform files matching glob pattern(s)",
      "  unwind                     auto-detect shadcn project, transform ui components, and rewrite global css",
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

function commonAncestor(paths: string[]): string {
  if (paths.length === 1) return dirname(paths[0]);
  const parts = paths.map((p) => p.split(sep));
  const minLen = Math.min(...parts.map((p) => p.length - 1));
  let i = 0;
  while (i < minLen && parts.every((p) => p[i] === parts[0][i])) i++;
  return parts[0].slice(0, i).join(sep) || sep;
}

async function mergeLocalCssWithExisting(cssPath: string, nextLocal: Root): Promise<string> {
  let existingLocalCss: string;
  try {
    existingLocalCss = await readFile(cssPath, "utf-8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return nextLocal.toString();
    }

    throw error;
  }

  if (existingLocalCss.trim() === "") {
    return nextLocal.toString();
  }

  try {
    const existingLocalRoot = postcss.parse(existingLocalCss);
    return mergeLocalRoots([existingLocalRoot, nextLocal]).toString();
  } catch {
    // Preserve existing authored CSS even if it cannot be parsed cleanly.
    return `${existingLocalCss.trimEnd()}\n\n${nextLocal.toString()}`;
  }
}

async function main() {
  const importName = values["import-name"] ?? "styles";
  const outputDir = values.output ? resolve(values.output) : undefined;
  const dry = values.dry;

  // --- File discovery & CSS context ---
  let inputFiles: string[] = [];
  let css: string | undefined;
  let base: string | undefined;
  let shadcnMode = false;
  let shadcnMetadata: Awaited<ReturnType<typeof resolveShadcnProject>> | undefined;

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
    shadcnMetadata = await resolveShadcnProject(process.cwd());
    if (!shadcnMetadata) {
      console.error(
        "No glob pattern provided and no shadcn project found (components.json not found).",
      );
      process.exit(1);
    }

    shadcnMode = true;
    css = shadcnMetadata.css;
    base = shadcnMetadata.base;

    const searchDir = shadcnMetadata.uiPath ?? shadcnMetadata.componentsPath;
    inputFiles = (await Array.fromAsync(glob("**/*.{tsx,ts,jsx,js}", { cwd: searchDir }))).map(
      (f) => resolve(searchDir, f),
    );
  }

  // --css flag content overrides auto-detected CSS
  if (values.css) {
    css = await readFile(resolve(values.css), "utf-8");
  }

  inputFiles = [...new Set(inputFiles)].sort();

  if (inputFiles.length === 0) {
    console.error("No input files found.");
    process.exit(1);
  }

  const fileBase = outputDir
    ? shadcnMode && shadcnMetadata
      ? shadcnMetadata.base
      : commonAncestor(inputFiles)
    : undefined;

  // --- Transform loop ---
  let successCount = 0;
  let failCount = 0;
  const globalRoots: Root[] = [];

  for (const filePath of inputFiles) {
    try {
      const result = await transform({ path: filePath, css, base, importName });
      if (result.targetCount === 0) {
        continue;
      }

      globalRoots.push(result.global);

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
      const localCss = dry
        ? result.local.toString()
        : await mergeLocalCssWithExisting(cssDest, result.local);

      if (dry) {
        console.log(`  write: ${sourceDest}`);
        console.log(`  write: ${cssDest}`);
      } else {
        await mkdir(dirname(sourceDest), { recursive: true });
        await writeFile(sourceDest, sourceContent, "utf-8");
        await mkdir(dirname(cssDest), { recursive: true });
        await writeFile(cssDest, localCss, "utf-8");
      }

      if (!shadcnMode) {
        const globalCss = result.global.toString();
        const globalDest = cssDest.replace(/\.module\.css$/, ".global.css");

        if (dry) {
          if (globalCss) console.log(`  write: ${globalDest}`);
        } else {
          if (globalCss) await writeFile(globalDest, globalCss, "utf-8");
        }
      }

      successCount++;
    } catch (err) {
      console.error(`Error transforming ${filePath}:`, err);
      failCount++;
    }
  }

  if (shadcnMode && shadcnMetadata && successCount > 0) {
    const mergedGlobalCss = mergeGlobalRoots(globalRoots).toString();
    const globalDest = outputDir
      ? join(outputDir, relative(shadcnMetadata.base, shadcnMetadata.cssPath))
      : shadcnMetadata.cssPath;

    if (dry) {
      console.log(`  write: ${globalDest}`);
    } else {
      await mkdir(dirname(globalDest), { recursive: true });
      await writeFile(globalDest, mergedGlobalCss, "utf-8");
    }
  }

  console.log(
    `\n${dry ? "[dry run] " : ""}${successCount} file(s) transformed${failCount > 0 ? `, ${failCount} failed` : ""}.`,
  );

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
