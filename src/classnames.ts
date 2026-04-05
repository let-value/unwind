import { readFile } from "node:fs/promises";
import { type File, type ASTNode } from "jscodeshift";

import { codeshift } from "./codeshift.ts";
import { dirname, join, parse } from "node:path";

type Source = "className" | "cva";

interface Branch {
  node: ASTNode;
  breadcrumbs: Breadcrumb[];
  source: Source | undefined;
}

export interface Breadcrumb {
  kind:
    | "variable"
    | "function"
    | "cva"
    | "variants"
    | "variant"
    | "condition"
    | "classNames"
    | "compoundVariants"
    | "className";
  name?: string;
}

export interface ExtractedClassName {
  source: Source;
  classNames: string;
  breadcrumbs: Breadcrumb[];
}

function isASTNode(value: unknown): value is ASTNode {
  return Boolean(value) && typeof value === "object" && typeof (value as ASTNode).type === "string";
}

function isFunctionLike(node: ASTNode): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

function getIdentifierName(node: ASTNode): string | undefined {
  return node.type === "Identifier" && typeof node.name === "string" ? node.name : undefined;
}

function getStaticString(node: ASTNode): string | undefined {
  if (node.type === "StringLiteral" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "TemplateLiteral") {
    const expressions = Array.isArray(node.expressions) ? node.expressions : [];
    const quasis = Array.isArray(node.quasis) ? node.quasis : [];

    if (expressions.length > 0) {
      return undefined;
    }

    return quasis
      .map((quasi) =>
        isASTNode(quasi) && quasi.value && typeof quasi.value === "object"
          ? ((quasi.value as { cooked?: unknown }).cooked ?? "")
          : "",
      )
      .join("");
  }

  if (node.type === "TSLiteralType" && isASTNode(node.literal)) {
    return getStaticString(node.literal);
  }

  if (node.type === "JSXExpressionContainer" && isASTNode(node.expression)) {
    return getStaticString(node.expression);
  }

  return undefined;
}

function getPropertyName(node: ASTNode): string | undefined {
  if (!("key" in node) || !isASTNode(node.key)) {
    return undefined;
  }

  if (node.key.type === "Identifier" || node.key.type === "JSXIdentifier") {
    return typeof node.key.name === "string" ? node.key.name : undefined;
  }

  return getStaticString(node.key);
}

function getObjectPropertyValue(node: ASTNode): ASTNode | undefined {
  return "value" in node && isASTNode(node.value) ? node.value : undefined;
}

function getExpressionName(node: ASTNode): string | undefined {
  if (node.type === "Identifier" && typeof node.name === "string") {
    return node.name;
  }

  if (node.type === "JSXExpressionContainer" && isASTNode(node.expression)) {
    return getExpressionName(node.expression);
  }

  if (node.type === "UnaryExpression" && isASTNode(node.argument)) {
    const argumentName = getExpressionName(node.argument);
    return argumentName ? `${String(node.operator)}${argumentName}` : undefined;
  }

  if (node.type === "MemberExpression" && isASTNode(node.object)) {
    const objectName = getExpressionName(node.object);

    if (!objectName) {
      return undefined;
    }

    if (!isASTNode(node.property)) {
      return objectName;
    }

    if (!node.computed) {
      const propertyName = getExpressionName(node.property);
      return propertyName ? `${objectName}.${propertyName}` : objectName;
    }

    const propertyName = getStaticString(node.property) ?? getExpressionName(node.property);
    return propertyName ? `${objectName}[${propertyName}]` : objectName;
  }

  return undefined;
}

function serializeBreadcrumbs(breadcrumbs: Breadcrumb[]): string {
  return breadcrumbs.map((crumb) => `${crumb.kind}:${crumb.name ?? ""}`).join(">");
}

function pushClassNameResult(
  { node, breadcrumbs, source }: Branch,
  results: ExtractedClassName[],
  seen: Set<string>,
) {
  if (!source) {
    return;
  }

  const classNames = getStaticString(node)?.trim();
  if (!classNames) {
    return;
  }

  const key = `${source}:${serializeBreadcrumbs(breadcrumbs)}:${classNames}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  results.push({
    source,
    classNames,
    breadcrumbs: Array.from(breadcrumbs),
  });
}

function getFunctionDeclarationBranches({
  node,
  breadcrumbs,
  source,
}: Branch): Branch[] | undefined {
  if (node.type !== "FunctionDeclaration" || !isASTNode(node.id) || !isASTNode(node.body)) {
    return undefined;
  }

  const name = getIdentifierName(node.id);
  if (!name) {
    return undefined;
  }

  return [
    {
      node: node.body,
      breadcrumbs: [...breadcrumbs, { kind: "function", name }],
      source,
    },
  ];
}

function getClassNameAttributeBranches({ node, breadcrumbs }: Branch): Branch[] | undefined {
  if (node.type !== "JSXAttribute" || !isASTNode(node.name) || !isASTNode(node.value)) {
    return undefined;
  }

  if (node.name.type !== "JSXIdentifier" || node.name.name !== "className") {
    return undefined;
  }

  return [
    {
      node: node.value,
      breadcrumbs: [...breadcrumbs, { kind: "className" }],
      source: "className",
    },
  ];
}

function getCvaBranches({ node, breadcrumbs }: Branch): Branch[] | undefined {
  if (node.type !== "CallExpression" || !isASTNode(node.callee)) {
    return undefined;
  }

  if (node.callee.type !== "Identifier" || node.callee.name !== "cva") {
    return undefined;
  }

  const breadcrumb: Breadcrumb = { kind: "cva" };
  const result: Branch[] = [];

  for (const argument of Array.isArray(node.arguments) ? node.arguments : []) {
    if (isASTNode(argument)) {
      result.push({ node: argument, breadcrumbs: [...breadcrumbs, breadcrumb], source: "cva" });
    }
  }

  return result;
}

function getExpressionBranches({ node, breadcrumbs, source }: Branch): Branch[] | undefined {
  if (!source) {
    return undefined;
  }

  switch (node.type) {
    case "JSXExpressionContainer":
      return isASTNode(node.expression) ? [{ node: node.expression, breadcrumbs, source }] : [];
    case "CallExpression":
      return (Array.isArray(node.arguments) ? node.arguments : []).flatMap((argument) =>
        isASTNode(argument) ? [{ node: argument, breadcrumbs, source }] : [],
      );
    case "ArrayExpression":
      return (Array.isArray(node.elements) ? node.elements : []).flatMap((element) =>
        isASTNode(element) ? [{ node: element, breadcrumbs, source }] : [],
      );
    case "ConditionalExpression": {
      const name = isASTNode(node.test) ? getExpressionName(node.test) : undefined;
      const breadcrumb: Breadcrumb = { kind: "condition", name };
      const result: Branch[] = [];

      if (isASTNode(node.consequent)) {
        result.push({ node: node.consequent, breadcrumbs: [...breadcrumbs, breadcrumb], source });
      }

      if (isASTNode(node.alternate)) {
        result.push({ node: node.alternate, breadcrumbs: [...breadcrumbs, breadcrumb], source });
      }

      return result;
    }
    case "LogicalExpression": {
      const name = isASTNode(node.left) ? getExpressionName(node.left) : undefined;
      const breadcrumb: Breadcrumb = { kind: "condition", name };
      const result: Branch[] = [];

      if (isASTNode(node.left)) {
        result.push({ node: node.left, breadcrumbs: [...breadcrumbs, breadcrumb], source });
      }

      if (isASTNode(node.right)) {
        result.push({ node: node.right, breadcrumbs: [...breadcrumbs, breadcrumb], source });
      }

      return result;
    }
    default:
      return undefined;
  }
}

function getVariantsBranches({ node, breadcrumbs, source }: Branch): Branch[] | undefined {
  if (node.type !== "ObjectExpression") {
    return undefined;
  }

  const lastBreadcrumb = breadcrumbs.at(-1);

  if (lastBreadcrumb?.kind === "cva") {
    const result: Branch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isASTNode(property)) {
        continue;
      }

      const propertyName = getPropertyName(property);
      const node = getObjectPropertyValue(property);

      if (!propertyName || !node) {
        continue;
      }

      if (propertyName === "variants") {
        result.push({
          node,
          breadcrumbs: [...breadcrumbs, { kind: "variants" }],
          source,
        });
        continue;
      }

      if (propertyName === "compoundVariants") {
        result.push({
          node,
          breadcrumbs: [...breadcrumbs, { kind: "compoundVariants" }],
          source,
        });
        continue;
      }

      if (propertyName === "class" || propertyName === "className") {
        result.push({
          node,
          breadcrumbs,
          source,
        });
      }
    }

    return result;
  }

  if (lastBreadcrumb?.kind === "variants") {
    const result: Branch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isASTNode(property)) {
        continue;
      }

      const propertyName = getPropertyName(property);
      const node = getObjectPropertyValue(property);

      if (!propertyName || !node) {
        continue;
      }

      result.push({
        node,
        breadcrumbs: [...breadcrumbs, { kind: "variant", name: propertyName }],
        source,
      });
    }

    return result;
  }

  if (lastBreadcrumb?.kind === "variant") {
    const result: Branch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isASTNode(property)) {
        continue;
      }

      const name = getPropertyName(property);
      const node = getObjectPropertyValue(property);

      if (!name || !node) {
        continue;
      }

      result.push({
        node,
        breadcrumbs: [...breadcrumbs, { kind: "classNames", name }],
        source,
      });
    }

    return result;
  }

  if (!source) {
    return undefined;
  }

  const result: Branch[] = [];

  for (const property of Array.isArray(node.properties) ? node.properties : []) {
    if (!isASTNode(property)) {
      continue;
    }

    const name = getPropertyName(property);
    const node = getObjectPropertyValue(property);

    if (!node || (name !== "class" && name !== "className")) {
      continue;
    }

    result.push({
      node,
      breadcrumbs,
      source,
    });
  }

  return result.length > 0 ? result : undefined;
}

function getCompoundVariantBranches({ node, breadcrumbs, source }: Branch): Branch[] | undefined {
  if (node.type !== "ArrayExpression" || breadcrumbs.at(-1)?.kind !== "compoundVariants") {
    return undefined;
  }

  const result: Branch[] = [];

  for (const [index, item] of (Array.isArray(node.elements) ? node.elements : []).entries()) {
    if (!isASTNode(item)) {
      continue;
    }

    result.push({
      node: item,
      breadcrumbs: [...breadcrumbs, { kind: "classNames", name: String(index) }],
      source,
    });
  }

  return result;
}

function getVariableDeclaratorBranches({
  node,
  breadcrumbs,
  source,
}: Branch): Branch[] | undefined {
  if (node.type !== "VariableDeclarator" || !isASTNode(node.id) || !isASTNode(node.init)) {
    return undefined;
  }

  const name = getIdentifierName(node.id);
  if (!name) {
    return undefined;
  }

  const breadcrumb = isFunctionLike(node.init)
    ? { kind: "function" as const, name }
    : { kind: "variable" as const, name };

  return [
    {
      node: node.init,
      breadcrumbs: [...breadcrumbs, breadcrumb],
      source,
    },
  ];
}

function getGenericChildBranches(branch: Branch): Branch[] {
  const result: Branch[] = [];

  for (const node of Object.values(branch.node)) {
    if (isASTNode(node)) {
      result.push({ ...branch, node });
      continue;
    }

    if (!Array.isArray(node)) {
      continue;
    }

    for (const item of node) {
      if (isASTNode(item)) {
        result.push({ ...branch, node: item });
      }
    }
  }

  return result;
}

function getNextBranches(branch: Branch): Branch[] {
  const specializedBranches =
    getVariableDeclaratorBranches(branch) ??
    getFunctionDeclarationBranches(branch) ??
    getClassNameAttributeBranches(branch) ??
    getCvaBranches(branch) ??
    getVariantsBranches(branch) ??
    getCompoundVariantBranches(branch) ??
    getExpressionBranches(branch);

  return specializedBranches ?? getGenericChildBranches(branch);
}

function walkFile(branch: Branch, results: ExtractedClassName[], seen: Set<string>) {
  pushClassNameResult(branch, results, seen);

  for (const nextBranch of getNextBranches(branch)) {
    walkFile(nextBranch, results, seen);
  }
}

export function getTreeClassNames(node: File): ExtractedClassName[] {
  const result: ExtractedClassName[] = [];
  const seen = new Set<string>();

  const root: Branch = {
    node,
    breadcrumbs: [],
    source: undefined,
  };

  walkFile(root, result, seen);

  return result;
}

export function getSourceClassNames(source: string): ExtractedClassName[] {
  const ast = codeshift(source).get().value as File;
  return getTreeClassNames(ast);
}

export async function getFileClassNames(path: string): Promise<ExtractedClassName[]> {
  const source = await readFile(path, "utf8");
  return getSourceClassNames(source);
}

export function getCssModulePath(sourceFilePath: string): string {
  const parsed = parse(sourceFilePath);

  if (parsed.ext.length === 0) {
    return join(dirname(sourceFilePath), `${parsed.base}.module.css`);
  }

  return join(parsed.dir, `${parsed.name}.module.css`);
}
