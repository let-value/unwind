import { relative, dirname } from "node:path";
import type { ASTNode, Collection, File } from "jscodeshift";
import type { Root } from "postcss";

import { j } from "./codeshift.ts";
import { getCssModulePath, getTreeClassNames } from "./classnames.ts";
import { createTransformTargets } from "./targets.ts";
import { compileTailwindTargets } from "./compile.ts";
import { readFile } from "node:fs/promises";

export interface TransformOptions {
  path: string;
  source?: string;
  css?: string;
  base?: string;
  importName?: string;
}

export interface TransformResult {
  root: Collection;
  global: Root;
  local: Root;
}

export async function transform({
  path,
  source: sourceOverride,
  css,
  base,
  importName = "styles",
}: TransformOptions): Promise<TransformResult> {
  const cssModulePath = getCssModulePath(path);
  const source = sourceOverride ?? (await readFile(path, "utf-8"));

  const root = j(source);
  const node = root.get().value as File;

  const extracted = getTreeClassNames(node);
  const targets = createTransformTargets(extracted);
  const { global, local } = await compileTailwindTargets({ css, targets, base });

  const nodeToKey = new Map<ASTNode, string>(
    targets.map((target) => [target.node, target.outputSelector.slice(1)]),
  );

  function makeReplacement(key: string) {
    return j.memberExpression(j.identifier(importName), j.stringLiteral(key), true);
  }

  function replaceNode(
    path: { node: ASTNode; parent: { node: ASTNode }; replace(n: ASTNode): void },
    key: string,
  ) {
    const replacement = makeReplacement(key);
    if (
      path.parent.node.type === "JSXAttribute" &&
      (path.parent.node as { value?: ASTNode }).value === path.node
    ) {
      path.replace(j.jsxExpressionContainer(replacement));
    } else {
      path.replace(replacement);
    }
  }

  root.find(j.StringLiteral).forEach((path) => {
    const key = nodeToKey.get(path.node);
    if (key) replaceNode(path as Parameters<typeof replaceNode>[0], key);
  });

  root.find(j.TemplateLiteral).forEach((path) => {
    const key = nodeToKey.get(path.node as unknown as ASTNode);
    if (key) replaceNode(path as Parameters<typeof replaceNode>[0], key);
  });

  // When the className attribute value is a JSXExpressionContainer (e.g.
  // className={"p-4"} or className={`p-4`}), classnames.ts stores the
  // JSXExpressionContainer node itself — replace it with a new one wrapping
  // the member expression.
  root.find(j.JSXExpressionContainer).forEach((path) => {
    const key = nodeToKey.get(path.node as unknown as ASTNode);
    if (!key) return;
    path.replace(j.jsxExpressionContainer(makeReplacement(key)));
  });

  const relPath = relative(dirname(path), cssModulePath).replace(/\\/g, "/");
  const importPath = relPath.startsWith(".") ? relPath : `./${relPath}`;

  const alreadyImported = root
    .find(j.ImportDeclaration)
    .some((path) => path.node.source.value === importPath);

  if (!alreadyImported) {
    const cssImport = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier(importName))],
      j.stringLiteral(importPath),
    );

    const firstImport = root.find(j.ImportDeclaration).at(0);
    if (firstImport.length > 0) {
      firstImport.insertBefore(cssImport);
    } else {
      root.find(j.Program).get("body", 0).insertBefore(cssImport);
    }
  }

  return { root, global, local };
}
