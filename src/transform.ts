import { dirname, join, parse } from "node:path";
import type { API, FileInfo, Options } from "jscodeshift";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";
import {
  compileTailwindTargets,
  type TailwindCompileResult,
} from "./tailwind-compile.ts";
import {
  resolveTailwindCssEntryPath,
  resolveTailwindProjectContext,
  type TailwindProjectContext,
} from "./tailwind-context.ts";
import {
  createTransformTargets,
  type TransformTarget,
} from "./transform-targets.ts";

export interface TransformOptions extends Options {
  /** Dry run - report changes without writing to disk */
  dry?: boolean;
}

export interface TransformResult extends TailwindCompileResult {
  cssModulePath: string;
  targets: TransformTarget[];
  context?: TailwindProjectContext;
}

export function deriveTargetCssModulePath(sourceFilePath: string): string {
  const parsed = parse(sourceFilePath);

  if (parsed.ext.length === 0) {
    return join(dirname(sourceFilePath), `${parsed.base}.module.css`);
  }

  return join(parsed.dir, `${parsed.name}.module.css`);
}

export { resolveTailwindCssEntryPath, resolveTailwindProjectContext };

export async function transform(
  file: FileInfo,
  _api: API,
  _options: TransformOptions = {},
): Promise<TransformResult | undefined> {
  const classNames = extractClassNameStringsFromSource(file.source);
  const targets = createTransformTargets(classNames);
  const context = await resolveTailwindProjectContext(file.path);

  if (targets.length === 0 && !context) {
    return undefined;
  }

  const compiled = await compileTailwindTargets(targets, {
    context,
  });

  return {
    ...compiled,
    cssModulePath: deriveTargetCssModulePath(file.path),
    targets,
    context,
  };
}

export default transform;
