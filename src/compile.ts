import { compile } from "@tailwindcss/node";
import postcss, { type AtRule, type Container, type Node, type Root, type Rule } from "postcss";
import postcssNested from "postcss-nested";
import selectorParser, { type Selector } from "postcss-selector-parser";
import type { TransformTarget } from "./targets.ts";

const TAILWIND_ENTRYPOINT = `@import "tailwindcss";`;

export function normalizeClassTokens(classNames: string): string[] {
  return [
    ...new Set(
      classNames
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  ];
}

export function extractClassNameTokens(classNames: Iterable<string>): string[] {
  return normalizeClassTokens([...classNames].join(" "));
}

function createSelectorTemplate(selector: string): Selector {
  const root = selectorParser().astSync(selector);
  const firstSelector = root.first;

  if (!firstSelector) {
    throw new Error(`Expected a selector, received "${selector}"`);
  }

  return firstSelector.clone();
}

function collectClassNamesFromSelector(selector: string): Set<string> {
  const classNames = new Set<string>();

  selectorParser((root) => {
    root.walkClasses((node) => {
      classNames.add(node.value);
    });
  }).processSync(selector);

  return classNames;
}

function collectIdsFromSelector(selector: string): Set<string> {
  const ids = new Set<string>();

  selectorParser((root) => {
    root.walkIds((node) => {
      ids.add(node.value);
    });
  }).processSync(selector);

  return ids;
}

function replaceUtilitySelector(
  selector: string,
  utilityClassNames: Set<string>,
  outputTemplate: Selector,
): string {
  return selectorParser((root) => {
    root.each((entry) => {
      const rewrittenNodes = entry.nodes.flatMap((node) => {
        if (node.type !== "class" || !utilityClassNames.has(node.value)) {
          return [node.clone()];
        }

        return outputTemplate.nodes.map((templateNode) => templateNode.clone());
      });

      entry.removeAll();

      for (const rewrittenNode of rewrittenNodes) {
        entry.append(rewrittenNode);
      }
    });
  }).processSync(selector);
}

function isStructuralMarkerToken(token: string): boolean {
  return (
    token === "group" ||
    token === "peer" ||
    token.startsWith("group/") ||
    token.startsWith("peer/")
  );
}

interface CompiledSelectorTarget {
  classTokens: string[];
  outputSelector: string;
}

type MarkerSelectors = Map<string, string[]>;

function createMarkerSelectors(targets: CompiledSelectorTarget[]): MarkerSelectors {
  const markerSelectors = new Map<string, string[]>();

  for (const { classTokens, outputSelector } of targets) {
    for (const classToken of classTokens) {
      if (!isStructuralMarkerToken(classToken)) {
        continue;
      }

      const selectors = markerSelectors.get(classToken) ?? [];
      if (!selectors.includes(outputSelector)) {
        selectors.push(outputSelector);
      }
      markerSelectors.set(classToken, selectors);
    }
  }

  return markerSelectors;
}

async function compileTargetStyles({
  css,
  classTokens,
  outputSelector,
  base,
  markerSelectors,
}: {
  css?: string;
  classTokens: string[];
  outputSelector: string;
  base?: string;
  markerSelectors: MarkerSelectors;
}) {
  const compiler = await compile(css ?? TAILWIND_ENTRYPOINT, {
    base: base ?? process.cwd(),
    onDependency: () => {},
  });

  const styles = compiler.build(classTokens);

  const root = await parseCss(styles);
  const global = getGlobalStyles({ root, classTokens });
  const local = await getLocalStyles({
    root,
    global,
    classTokens,
    outputSelector,
    markerSelectors,
  });

  return {
    global,
    local,
  };
}

function createSelectorReferenceNodes(outputSelectors: string[]): selectorParser.Node[] {
  if (outputSelectors.length === 1) {
    return createSelectorTemplate(outputSelectors[0]).nodes.map((node) => node.clone());
  }

  const wrapperRoot = selectorParser().astSync(`:is(${outputSelectors.join(", ")})`);
  const wrapperSelector = wrapperRoot.first;

  if (!wrapperSelector) {
    throw new Error(`Expected selector references for "${outputSelectors.join(", ")}"`);
  }

  return wrapperSelector.nodes.map((node) => node.clone());
}

function rewriteStructuralReferenceSelectors(
  selector: string,
  markerSelectors: MarkerSelectors,
): string {
  if (markerSelectors.size === 0) {
    return selector;
  }

  return selectorParser((root) => {
    root.walkClasses((node) => {
      const outputSelectors = markerSelectors.get(node.value);
      if (!outputSelectors?.length) {
        return;
      }

      node.replaceWith(...createSelectorReferenceNodes(outputSelectors));
    });
  }).processSync(selector);
}

function rewriteStructuralReferenceSelectorsInRule(
  rule: Rule,
  markerSelectors: MarkerSelectors,
) {
  rule.selector = rewriteStructuralReferenceSelectors(rule.selector, markerSelectors);

  rule.walkRules((nestedRule) => {
    nestedRule.selector = rewriteStructuralReferenceSelectors(nestedRule.selector, markerSelectors);
  });
}

function wrapNodeWithAtRuleAncestors(node: Node, rule: Rule): Node {
  let wrappedNode = node;
  let currentParent = rule.parent;

  while (currentParent && currentParent.type !== "root") {
    if (currentParent.type === "atrule") {
      const wrappedAtRule = postcss.atRule({
        name: currentParent.name,
        params: currentParent.params,
      });
      wrappedAtRule.append(wrappedNode);
      wrappedNode = wrappedAtRule;
    }

    currentParent = currentParent.parent;
  }

  return wrappedNode;
}

function getMatchingRules({
  root,
  classTokens,
  outputSelector,
  markerSelectors,
}: {
  root: Root;
  classTokens: string[];
  outputSelector: string;
  markerSelectors: MarkerSelectors;
}): Root {
  const utilityClassNames = new Set(classTokens);
  const selectedRulesByClassName = new Map<string, Node>();
  const rewrittenRoot = postcss.root();
  const outputTemplate = createSelectorTemplate(outputSelector);

  root.walkRules((rule) => {
    const selectorClassNames = collectClassNamesFromSelector(rule.selector);
    const matchesRequestedClass = [...selectorClassNames].some((className) =>
      utilityClassNames.has(className),
    );

    if (!matchesRequestedClass) {
      return;
    }

    for (const className of selectorClassNames) {
      if (!utilityClassNames.has(className) || selectedRulesByClassName.has(className)) {
        continue;
      }

      const rewrittenRule = rule.clone();
      rewrittenRule.selector = replaceUtilitySelector(
        rewrittenRule.selector,
        utilityClassNames,
        outputTemplate,
      );
      rewriteStructuralReferenceSelectorsInRule(rewrittenRule, markerSelectors);
      rewrittenRule.raws.before = "";
      selectedRulesByClassName.set(className, wrapNodeWithAtRuleAncestors(rewrittenRule, rule));
    }
  });

  for (const classToken of classTokens) {
    const selectedRule = selectedRulesByClassName.get(classToken);
    if (selectedRule) {
      rewrittenRoot.append(selectedRule);
    }
  }

  return rewrittenRoot;
}

function moveChildren(from: Container, to: Container) {
  for (const child of from.nodes?.slice() ?? []) {
    child.remove();
    to.append(child);
  }
}

function mergeDuplicateChildren(container: Container) {
  if (!container.nodes) {
    return;
  }

  const rulesBySelector = new Map<string, Rule>();
  const atRulesBySignature = new Map<string, AtRule>();
  const serializedLeafNodes = new Set<string>();

  for (const node of container.nodes.slice()) {
    if (node.type === "rule") {
      mergeDuplicateChildren(node);

      const existingRule = rulesBySelector.get(node.selector);
      if (existingRule) {
        moveChildren(node, existingRule);
        node.remove();
        mergeDuplicateChildren(existingRule);
        continue;
      }

      rulesBySelector.set(node.selector, node);
      continue;
    }

    if (node.type === "atrule" && node.nodes) {
      mergeDuplicateChildren(node);

      const signature = `${node.name}:${node.params}`;
      const existingAtRule = atRulesBySignature.get(signature);
      if (existingAtRule) {
        moveChildren(node, existingAtRule);
        node.remove();
        mergeDuplicateChildren(existingAtRule);
        continue;
      }

      atRulesBySignature.set(signature, node);
      continue;
    }

    const serializedNode = node.toString();
    if (serializedLeafNodes.has(serializedNode)) {
      node.remove();
      continue;
    }

    serializedLeafNodes.add(serializedNode);
  }
}

async function parseCss(source: string): Promise<Root> {
  const { root } = await postcss([]).process(source, { from: undefined });

  if (root.type !== "root") {
    throw new Error(`Unexpected root node: ${String(root)}`);
  }

  return root;
}

function isInsideKeyframes(rule: Rule): boolean {
  let currentParent: Node | undefined = rule.parent;

  while (currentParent) {
    if (currentParent.type === "atrule" && (currentParent as AtRule).name === "keyframes") {
      return true;
    }

    currentParent = currentParent.parent;
  }

  return false;
}

interface SelectorReferenceSet {
  classes: Set<string>;
  ids: Set<string>;
}

function collectSelectorReferences(root: Root): SelectorReferenceSet {
  const classes = new Set<string>();
  const ids = new Set<string>();

  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) {
      return;
    }

    for (const className of collectClassNamesFromSelector(rule.selector)) {
      classes.add(className);
    }

    for (const id of collectIdsFromSelector(rule.selector)) {
      ids.add(id);
    }
  });

  return { classes, ids };
}

function collectTargetSelectorReferences(outputSelector: string): SelectorReferenceSet {
  const classes = new Set<string>();
  const ids = new Set<string>();

  for (const className of collectClassNamesFromSelector(outputSelector)) {
    classes.add(className);
  }

  for (const id of collectIdsFromSelector(outputSelector)) {
    ids.add(id);
  }

  return { classes, ids };
}

function isInsideGlobalPseudo(node: selectorParser.Node): boolean {
  let currentParent = node.parent;

  while (currentParent) {
    if (currentParent.type === "pseudo" && currentParent.value === ":global") {
      return true;
    }

    currentParent = currentParent.parent;
  }

  return false;
}

function createGlobalWrapper(node: selectorParser.Node): selectorParser.Pseudo {
  return selectorParser.pseudo({
    value: ":global",
    nodes: [
      selectorParser.selector({
        value: "",
        nodes: [node.clone()],
      }),
    ],
  });
}

function protectGlobalSelectorReferences(
  root: Root,
  globalReferences: SelectorReferenceSet,
  localReferences: SelectorReferenceSet,
) {
  root.walkRules((rule) => {
    if (isInsideKeyframes(rule)) {
      return;
    }

    rule.selector = selectorParser((selectorRoot) => {
      selectorRoot.walkClasses((node) => {
        if (
          !globalReferences.classes.has(node.value) ||
          localReferences.classes.has(node.value) ||
          isInsideGlobalPseudo(node)
        ) {
          return;
        }

        node.replaceWith(createGlobalWrapper(node));
      });

      selectorRoot.walkIds((node) => {
        if (
          !globalReferences.ids.has(node.value) ||
          localReferences.ids.has(node.value) ||
          isInsideGlobalPseudo(node)
        ) {
          return;
        }

        node.replaceWith(createGlobalWrapper(node));
      });
    }).processSync(rule.selector);
  });
}

async function flattenNestedRoot(root: Root): Promise<Root> {
  const result = await postcss([postcssNested]).process(root.toString(), {
    from: undefined,
  });

  return parseCss(result.css);
}

function normalizeOutputAst(root: Root): Root {
  root.walkDecls((declaration) => {
    declaration.value = declaration.value.trim();
  });

  root.cleanRaws();
  return root;
}

function pruneEmptyContainers(container: Container) {
  if (!container.nodes) {
    return;
  }

  for (const node of container.nodes.slice()) {
    if ((node.type === "rule" || node.type === "atrule") && node.nodes) {
      pruneEmptyContainers(node);

      if (node.nodes.length === 0) {
        node.remove();
      }
    }
  }
}

// CSS Modules only scopes selectors at the top level; selectors inside @layer
// at-rules are not renamed. Unwrap every @layer block so its children become
// direct children of the container.
function unwrapLayers(container: Container): void {
  for (const node of (container.nodes ?? []).slice()) {
    if (node.type === "atrule" && (node as AtRule).name === "layer") {
      const layer = node as AtRule;
      for (const child of (layer.nodes ?? []).slice()) {
        child.remove();
        layer.before(child);
      }
      layer.remove();
    }
  }
}

// Tailwind emits @supports blocks (with opacity-correct color-mix values)
// before the plain fallback rules for the same selector. After @layer
// unwrapping both sets of rules exist at the same cascade level, so later
// source order wins. Move every @supports block to the end of its container
// so the opacity-correct values override the solid-color fallbacks in browsers
// that support color-mix.
function reorderSupportsBlocks(container: Container): void {
  const supportsNodes: Node[] = [];
  for (const node of (container.nodes ?? []).slice()) {
    if (node.type !== "atrule") continue;
    const atRule = node as AtRule;
    if (atRule.name === "supports") {
      supportsNodes.push(node);
      atRule.remove();
    } else if (atRule.name === "media") {
      reorderSupportsBlocks(atRule);
    }
  }
  for (const node of supportsNodes) {
    container.append(node);
  }
}

async function getLocalStyles({
  root,
  global,
  classTokens,
  outputSelector,
  markerSelectors,
}: {
  root: Root;
  global: Root;
  classTokens: string[];
  outputSelector: string;
  markerSelectors: MarkerSelectors;
}) {
  const local = postcss.root();

  const rewrittenRoot = getMatchingRules({
    root,
    classTokens,
    outputSelector,
    markerSelectors,
  });

  mergeDuplicateChildren(rewrittenRoot);
  moveChildren(rewrittenRoot, local);
  mergeDuplicateChildren(local);

  const flat = await flattenNestedRoot(local);

  protectGlobalSelectorReferences(
    flat,
    collectSelectorReferences(global),
    collectTargetSelectorReferences(outputSelector),
  );
  mergeDuplicateChildren(flat);
  unwrapLayers(flat);
  reorderSupportsBlocks(flat);
  mergeDuplicateChildren(flat);
  return normalizeOutputAst(flat);
}

function getGlobalStyles({ root, classTokens }: { root: Root; classTokens: string[] }): Root {
  const global = root.clone();
  const requestedClassTokens = new Set(classTokens);

  if (requestedClassTokens.size > 0) {
    global.walkRules((rule) => {
      const selectorClassNames = collectClassNamesFromSelector(rule.selector);
      const matchesRequestedClass = [...selectorClassNames].some((className) =>
        requestedClassTokens.has(className),
      );

      if (matchesRequestedClass) {
        rule.remove();
      }
    });
  }

  pruneEmptyContainers(global);
  mergeDuplicateChildren(global);
  return normalizeOutputAst(global);
}

export async function compileClasses({
  css,
  classNames,
  outputSelector = ".output",
  base,
}: {
  css?: string;
  classNames: string;
  outputSelector?: string;
  base?: string;
}) {
  const classTokens = normalizeClassTokens(classNames);
  const markerSelectors = createMarkerSelectors([{ classTokens, outputSelector }]);

  return compileTargetStyles({
    css,
    classTokens,
    outputSelector,
    base,
    markerSelectors,
  });
}

export function mergeGlobalRoots(roots: Root[]): Root {
  const merged = postcss.root();
  for (const root of roots) {
    moveChildren(root.clone(), merged);
  }
  pruneEmptyContainers(merged);
  mergeDuplicateChildren(merged);
  return normalizeOutputAst(merged);
}

export async function compileTailwindTargets({
  css,
  targets,
  base,
}: {
  css?: string;
  targets: TransformTarget[];
  base?: string;
}) {
  const tokenizedTargets = targets.map((target) => ({
    target,
    classTokens: normalizeClassTokens(target.classNames),
  }));
  const markerSelectors = createMarkerSelectors(
    tokenizedTargets.map(({ classTokens, target }) => ({
      classTokens,
      outputSelector: target.outputSelector,
    })),
  );

  const compiledTargets = await Promise.all(
    tokenizedTargets.map(({ classTokens, target }) =>
      compileTargetStyles({
        css,
        classTokens,
        outputSelector: target.outputSelector,
        base,
        markerSelectors,
      }),
    ),
  );

  const local = postcss.root();
  for (const compiledTarget of compiledTargets) {
    moveChildren(compiledTarget.local.clone(), local);
  }

  pruneEmptyContainers(local);
  mergeDuplicateChildren(local);
  reorderSupportsBlocks(local);

  return {
    global: mergeGlobalRoots(compiledTargets.map((compiledTarget) => compiledTarget.global)),
    local: normalizeOutputAst(local),
  };
}
