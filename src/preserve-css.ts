import postcss, { type Node } from "postcss";

const PRESERVED_CSS_COMMENT = "unwind-source-imports";
const PRESERVED_CSS_COMMENT_PATTERN = /\/\*\s*unwind-source-imports\n([\s\S]*?)\n\*\//;

export function hasPreservedCssComment(css: string): boolean {
  return PRESERVED_CSS_COMMENT_PATTERN.test(css);
}

function isPreservedCssComment(node: Node): boolean {
  return (
    node.type === "comment" &&
    ((node as { text?: string }).text ?? "").trim().startsWith(PRESERVED_CSS_COMMENT)
  );
}

export function stripPreservedCssComment(css: string): string {
  return css.replace(PRESERVED_CSS_COMMENT_PATTERN, "").trimStart();
}

function serializeNode(node: Node): string {
  const root = postcss.root();
  root.append(node.clone());
  root.cleanRaws();
  return root.toString();
}

function createNodeSignature(node: Node): string {
  return `${node.type}:${serializeNode(node)}`;
}

function parseCss(css: string) {
  return postcss.parse(css, { from: undefined });
}

function createMissingSourceCss(sourceCss: string, compiledCss: string): string {
  const sourceRoot = parseCss(stripPreservedCssComment(sourceCss));
  const compiledRoot = parseCss(stripPreservedCssComment(compiledCss));
  const compiledNodeCounts = new Map<string, number>();
  const missingRoot = postcss.root();

  for (const node of compiledRoot.nodes ?? []) {
    if (isPreservedCssComment(node)) {
      continue;
    }

    const signature = createNodeSignature(node);
    compiledNodeCounts.set(signature, (compiledNodeCounts.get(signature) ?? 0) + 1);
  }

  for (const node of sourceRoot.nodes ?? []) {
    if (isPreservedCssComment(node)) {
      continue;
    }

    const signature = createNodeSignature(node);
    const count = compiledNodeCounts.get(signature) ?? 0;

    if (count > 0) {
      compiledNodeCounts.set(signature, count - 1);
      continue;
    }

    missingRoot.append(node.clone());
  }

  missingRoot.cleanRaws();
  return missingRoot.toString().trim();
}

export function createPreservedCssComment(
  sourceCss: string,
  compiledCss = "",
): string | undefined {
  const missingCss = createMissingSourceCss(sourceCss, compiledCss);
  if (!missingCss) {
    return;
  }

  return `/* ${PRESERVED_CSS_COMMENT}\n${missingCss}\n*/`;
}

export function readPreservedCssComment(css: string): string | undefined {
  const preservedCss = PRESERVED_CSS_COMMENT_PATTERN.exec(css)?.[1]?.trim();
  if (!preservedCss) {
    return;
  }

  return preservedCss;
}

export function restorePreservedCss(css: string): string | undefined {
  const preservedCss = readPreservedCssComment(css);
  if (!preservedCss) {
    return;
  }

  return [preservedCss, stripPreservedCssComment(css)].filter(Boolean).join("\n");
}
