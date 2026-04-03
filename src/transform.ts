import type { API, FileInfo, Options } from "jscodeshift";
import { compileTailwindTargets } from "./tailwind-compile.ts";
import { createTransformTargets } from "./transform-targets.ts";
import { extractClassNameStringsFromSource } from "./classname-extract.ts";

export interface TransformOptions extends Options {
  /** Dry run â€” report changes without writing to disk */
  dry?: boolean;
}

export async function transform(
  file: FileInfo,
  _api: API,
  _options: TransformOptions = {},
): Promise<string | undefined> {
  const classNames = extractClassNameStringsFromSource(file.source);
  const targets = createTransformTargets(classNames);

  if (targets.length === 0) {
    return undefined;
  }

  return compileTailwindTargets(targets);
}

export default transform;
