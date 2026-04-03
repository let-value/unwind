import { glob } from "node:fs/promises";
import { resolve } from "node:path";
import jscodeshift from "jscodeshift";
import { transform } from "./transform.ts";

export { compileTailwindClasses } from "./tailwind-compile.ts";

export interface RunOptions {
  /** Glob patterns to match files */
  patterns: string[];
  /** Working directory for glob resolution */
  cwd?: string;
  /** Dry run — report changes without writing to disk */
  dry?: boolean;
}

export interface FileResult {
  file: string;
  status: "modified" | "unchanged" | "error";
  error?: Error;
}

/**
 * Resolve all files matching the provided glob patterns.
 */
export async function resolveFiles(
  patterns: string[],
  cwd: string = process.cwd(),
): Promise<string[]> {
  const sets = await Promise.all(
    patterns.map((pattern) =>
      Array.fromAsync(glob(pattern, { cwd })).then((files) => files.map((f) => resolve(cwd, f))),
    ),
  );
  return [...new Set(sets.flat())];
}

/**
 * Run the codemod transform over all files resolved from the given patterns.
 */
export async function run(options: RunOptions): Promise<FileResult[]> {
  const { patterns, cwd = process.cwd(), dry = false } = options;

  const files = await resolveFiles(patterns, cwd);
  const results: FileResult[] = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const { readFile, writeFile } = await import("node:fs/promises");
        const source = await readFile(file, "utf8");

        const j = jscodeshift.withParser("tsx");
        const api = {
          j,
          jscodeshift: j,
          stats: () => {},
          report: () => {},
        };

        const output = await transform({ path: file, source }, api);

        if (output == null || output === source) {
          results.push({ file, status: "unchanged" });
          return;
        }

        if (!dry) {
          await writeFile(file, output, "utf8");
        }

        results.push({ file, status: "modified" });
      } catch (error) {
        results.push({
          file,
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }),
  );

  return results;
}
