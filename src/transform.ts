import type { API, FileInfo, Options } from "jscodeshift";

export interface TransformOptions extends Options {
  /** Dry run — report changes without writing to disk */
  dry?: boolean;
}

/**
 * A no-op identity transform that can be extended with real codemod logic.
 *
 * Replace the body of this function with your actual transformation.
 */
export function transform(
  file: FileInfo,
  api: API,
  _options: TransformOptions = {},
): string | undefined {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Example: walk all nodes (extend this with real codemod logic)
  root.find(j.Node);

  // Return the modified source, or `undefined` to leave the file unchanged.
  return root.toSource();
}

export default transform;
