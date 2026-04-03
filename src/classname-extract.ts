import { readFile } from "node:fs/promises";
import jscodeshift from "jscodeshift";
import { normalizeClassTokens } from "./tailwind-compile.ts";

type AstNode = {
  type: string;
  [key: string]: unknown;
};

type ClassNameSource = "className" | "cva";

interface TraversalContext {
  breadcrumbs: ClassNameBreadcrumb[];
  source?: ClassNameSource;
}

interface TraversalBranch {
  node: AstNode;
  context: TraversalContext;
}

export interface ClassNameBreadcrumb {
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

export interface ExtractedClassNameString {
  source: ClassNameSource;
  value: string;
  breadcrumbs: ClassNameBreadcrumb[];
}

const j = jscodeshift.withParser("tsx");

function isAstNode(value: unknown): value is AstNode {
  return Boolean(value) && typeof value === "object" && typeof (value as AstNode).type === "string";
}

function isFunctionLike(node: AstNode): boolean {
  return node.type === "FunctionDeclaration"
    || node.type === "FunctionExpression"
    || node.type === "ArrowFunctionExpression";
}

function getIdentifierName(node: AstNode): string | undefined {
  return node.type === "Identifier" && typeof node.name === "string" ? node.name : undefined;
}

function getStaticString(node: AstNode): string | undefined {
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
        isAstNode(quasi) && quasi.value && typeof quasi.value === "object"
          ? ((quasi.value as { cooked?: unknown }).cooked ?? "")
          : "",
      )
      .join("");
  }

  if (node.type === "TSLiteralType" && isAstNode(node.literal)) {
    return getStaticString(node.literal);
  }

  if (node.type === "JSXExpressionContainer" && isAstNode(node.expression)) {
    return getStaticString(node.expression);
  }

  return undefined;
}

function getPropertyName(node: AstNode): string | undefined {
  if (!isAstNode(node.key)) {
    return undefined;
  }

  if (node.key.type === "Identifier" || node.key.type === "JSXIdentifier") {
    return typeof node.key.name === "string" ? node.key.name : undefined;
  }

  return getStaticString(node.key);
}

function getObjectPropertyValue(node: AstNode): AstNode | undefined {
  return isAstNode(node.value) ? node.value : undefined;
}

function getExpressionName(node: AstNode): string | undefined {
  if (node.type === "Identifier" && typeof node.name === "string") {
    return node.name;
  }

  if (node.type === "JSXExpressionContainer" && isAstNode(node.expression)) {
    return getExpressionName(node.expression);
  }

  if (node.type === "UnaryExpression" && isAstNode(node.argument)) {
    const argumentName = getExpressionName(node.argument);
    return argumentName ? `${String(node.operator)}${argumentName}` : undefined;
  }

  if (node.type === "MemberExpression" && isAstNode(node.object)) {
    const objectName = getExpressionName(node.object);

    if (!objectName) {
      return undefined;
    }

    if (!isAstNode(node.property)) {
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

function serializeBreadcrumbs(breadcrumbs: ClassNameBreadcrumb[]): string {
  return breadcrumbs.map((crumb) => `${crumb.kind}:${crumb.name ?? ""}`).join(">");
}

function appendContext(
  context: TraversalContext,
  breadcrumb?: ClassNameBreadcrumb,
  source?: ClassNameSource,
): TraversalContext {
  return {
    breadcrumbs: breadcrumb ? [...context.breadcrumbs, breadcrumb] : [...context.breadcrumbs],
    source: source ?? context.source,
  };
}

function createBranch(
  node: AstNode,
  context: TraversalContext,
  breadcrumb?: ClassNameBreadcrumb,
  source?: ClassNameSource,
): TraversalBranch {
  return {
    node,
    context: appendContext(context, breadcrumb, source),
  };
}

function getLastBreadcrumb(context: TraversalContext): ClassNameBreadcrumb | undefined {
  return context.breadcrumbs[context.breadcrumbs.length - 1];
}

function pushClassNameResult(
  node: AstNode,
  context: TraversalContext,
  results: ExtractedClassNameString[],
  seen: Set<string>,
) {
  if (!context.source) {
    return;
  }

  const value = getStaticString(node)?.trim();
  if (!value) {
    return;
  }

  const key = `${context.source}:${serializeBreadcrumbs(context.breadcrumbs)}:${value}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  results.push({
    source: context.source,
    value,
    breadcrumbs: context.breadcrumbs.map((crumb) => ({ ...crumb })),
  });
}

function getGenericChildBranches(branch: TraversalBranch): TraversalBranch[] {
  const children: TraversalBranch[] = [];

  for (const value of Object.values(branch.node)) {
    if (isAstNode(value)) {
      children.push({ node: value, context: branch.context });
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    for (const entry of value) {
      if (isAstNode(entry)) {
        children.push({ node: entry, context: branch.context });
      }
    }
  }

  return children;
}

function getVariableDeclaratorBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "VariableDeclarator" || !isAstNode(node.id) || !isAstNode(node.init)) {
    return undefined;
  }

  const name = getIdentifierName(node.id);
  if (!name) {
    return undefined;
  }

  const breadcrumb = isFunctionLike(node.init)
    ? { kind: "function" as const, name }
    : { kind: "variable" as const, name };

  return [createBranch(node.init, context, breadcrumb)];
}

function getFunctionDeclarationBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "FunctionDeclaration" || !isAstNode(node.id) || !isAstNode(node.body)) {
    return undefined;
  }

  const name = getIdentifierName(node.id);
  if (!name) {
    return undefined;
  }

  return [createBranch(node.body, context, { kind: "function", name })];
}

function getClassNameAttributeBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "JSXAttribute" || !isAstNode(node.name) || !isAstNode(node.value)) {
    return undefined;
  }

  if (node.name.type !== "JSXIdentifier" || node.name.name !== "className") {
    return undefined;
  }

  return [createBranch(node.value, context, { kind: "className" }, "className")];
}

function getCvaBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "CallExpression" || !isAstNode(node.callee)) {
    return undefined;
  }

  if (node.callee.type !== "Identifier" || node.callee.name !== "cva") {
    return undefined;
  }

  const cvaContext = appendContext(context, { kind: "cva" }, "cva");
  const nextBranches: TraversalBranch[] = [];

  for (const argument of Array.isArray(node.arguments) ? node.arguments : []) {
    if (isAstNode(argument)) {
      nextBranches.push({ node: argument, context: cvaContext });
    }
  }

  return nextBranches;
}

function getCollectingExpressionBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (!context.source) {
    return undefined;
  }

  switch (node.type) {
    case "JSXExpressionContainer":
      return isAstNode(node.expression) ? [{ node: node.expression, context }] : [];
    case "CallExpression":
      return (Array.isArray(node.arguments) ? node.arguments : []).flatMap((argument) =>
        isAstNode(argument) ? [{ node: argument, context }] : [],
      );
    case "ArrayExpression":
      return (Array.isArray(node.elements) ? node.elements : []).flatMap((element) =>
        isAstNode(element) ? [{ node: element, context }] : [],
      );
    case "ConditionalExpression": {
      const conditionName = isAstNode(node.test) ? getExpressionName(node.test) : undefined;
      const branchContext = conditionName
        ? appendContext(context, { kind: "condition", name: conditionName })
        : context;
      const branches: TraversalBranch[] = [];

      if (isAstNode(node.consequent)) {
        branches.push({ node: node.consequent, context: branchContext });
      }

      if (isAstNode(node.alternate)) {
        branches.push({ node: node.alternate, context: branchContext });
      }

      return branches;
    }
    case "LogicalExpression": {
      const conditionName = isAstNode(node.left) ? getExpressionName(node.left) : undefined;
      const branchContext = conditionName
        ? appendContext(context, { kind: "condition", name: conditionName })
        : context;
      const branches: TraversalBranch[] = [];

      if (isAstNode(node.left)) {
        branches.push({ node: node.left, context });
      }

      if (isAstNode(node.right)) {
        branches.push({ node: node.right, context: branchContext });
      }

      return branches;
    }
    default:
      return undefined;
  }
}

function getVariantsBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "ObjectExpression") {
    return undefined;
  }

  const lastBreadcrumb = getLastBreadcrumb(context);

  if (lastBreadcrumb?.kind === "cva") {
    const branches: TraversalBranch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isAstNode(property)) {
        continue;
      }

      const propertyName = getPropertyName(property);
      const value = getObjectPropertyValue(property);

      if (!propertyName || !value) {
        continue;
      }

      if (propertyName === "variants") {
        branches.push(createBranch(value, context, { kind: "variants" }));
        continue;
      }

      if (propertyName === "compoundVariants") {
        branches.push(createBranch(value, context, { kind: "compoundVariants" }));
        continue;
      }

      if (propertyName === "class" || propertyName === "className") {
        branches.push({ node: value, context });
      }
    }

    return branches;
  }

  if (lastBreadcrumb?.kind === "variants") {
    const branches: TraversalBranch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isAstNode(property)) {
        continue;
      }

      const propertyName = getPropertyName(property);
      const value = getObjectPropertyValue(property);

      if (!propertyName || !value) {
        continue;
      }

      branches.push(createBranch(value, context, { kind: "variant", name: propertyName }));
    }

    return branches;
  }

  if (lastBreadcrumb?.kind === "variant") {
    const branches: TraversalBranch[] = [];

    for (const property of Array.isArray(node.properties) ? node.properties : []) {
      if (!isAstNode(property)) {
        continue;
      }

      const propertyName = getPropertyName(property);
      const value = getObjectPropertyValue(property);

      if (!propertyName || !value) {
        continue;
      }

      branches.push(createBranch(value, context, { kind: "classNames", name: propertyName }));
    }

    return branches;
  }

  if (!context.source) {
    return undefined;
  }

  const classBranches: TraversalBranch[] = [];

  for (const property of Array.isArray(node.properties) ? node.properties : []) {
    if (!isAstNode(property)) {
      continue;
    }

    const propertyName = getPropertyName(property);
    const value = getObjectPropertyValue(property);

    if (!value || (propertyName !== "class" && propertyName !== "className")) {
      continue;
    }

    classBranches.push({ node: value, context });
  }

  return classBranches.length > 0 ? classBranches : undefined;
}

function getCompoundVariantBranches(branch: TraversalBranch): TraversalBranch[] | undefined {
  const { node, context } = branch;

  if (node.type !== "ArrayExpression" || getLastBreadcrumb(context)?.kind !== "compoundVariants") {
    return undefined;
  }

  const branches: TraversalBranch[] = [];

  for (const [index, element] of (Array.isArray(node.elements) ? node.elements : []).entries()) {
    if (!isAstNode(element)) {
      continue;
    }

    branches.push(createBranch(element, context, { kind: "classNames", name: String(index) }));
  }

  return branches;
}

function getNextBranches(branch: TraversalBranch): TraversalBranch[] {
  const specializedBranches = getVariableDeclaratorBranches(branch)
    ?? getFunctionDeclarationBranches(branch)
    ?? getClassNameAttributeBranches(branch)
    ?? getCvaBranches(branch)
    ?? getVariantsBranches(branch)
    ?? getCompoundVariantBranches(branch)
    ?? getCollectingExpressionBranches(branch);

  return specializedBranches ?? getGenericChildBranches(branch);
}

function walkClassNameBranches(
  branch: TraversalBranch,
  results: ExtractedClassNameString[],
  seen: Set<string>,
) {
  pushClassNameResult(branch.node, branch.context, results, seen);

  for (const nextBranch of getNextBranches(branch)) {
    walkClassNameBranches(nextBranch, results, seen);
  }
}

export function extractClassNameStringsFromSource(source: string): ExtractedClassNameString[] {
  const root = j(source).get().node as AstNode;
  const results: ExtractedClassNameString[] = [];
  const seen = new Set<string>();

  walkClassNameBranches(
    {
      node: root,
      context: {
        breadcrumbs: [],
      },
    },
    results,
    seen,
  );

  return results;
}

export async function extractClassNameStringsFromFile(
  filePath: string,
): Promise<ExtractedClassNameString[]> {
  return extractClassNameStringsFromSource(await readFile(filePath, "utf8"));
}

export function extractClassNameTokens(classNames: Iterable<string>): string[] {
  return normalizeClassTokens([...classNames].join(" "));
}
