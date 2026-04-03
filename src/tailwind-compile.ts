import { compile } from "@tailwindcss/node";
import postcss, { type AtRule, type Container, type Node, type Root, type Rule } from "postcss";
import selectorParser, { type Selector } from "postcss-selector-parser";
import { runCssCodemod, type CssCodemodTransform } from "./css-codemod.ts";

const TAILWIND_ENTRYPOINT = `@import "tailwindcss/theme";\n@import "tailwindcss/utilities";`;

function createEmptyRule(selector: string): Rule {
  return postcss.rule({ selector });
}

export function normalizeClassTokens(classNames: string): string[] {
  return [...new Set(classNames.split(/\s+/).map((token) => token.trim()).filter(Boolean))];
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

function replaceUtilitySelector(
  selector: string,
  utilityClassNames: Set<string>,
  outputSelector: string,
): string {
  const outputTemplate = createSelectorTemplate(outputSelector);

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

function cloneMatchingRulesInClassOrder(
  root: Root,
  classTokens: string[],
  outputSelector: string,
): Root {
  const utilityClassNames = new Set(classTokens);
  const selectedRulesByClassName = new Map<string, Rule>();
  const rewrittenRoot = postcss.root();

  root.walkRules((rule) => {
    if (rule.parent?.type !== "root") {
      return;
    }

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
        outputSelector,
      );
      rewrittenRule.raws.before = "";
      selectedRulesByClassName.set(className, rewrittenRule);
    }
  });

  for (const classToken of classTokens) {
    const selectedRule = selectedRulesByClassName.get(classToken);
    if (selectedRule) {
      rewrittenRoot.append(selectedRule);
    }
  }

  if (rewrittenRoot.nodes.length === 0) {
    rewrittenRoot.append(createEmptyRule(outputSelector));
  }

  return rewrittenRoot;
}

function moveChildren(from: Container<Node>, to: Container<Node>) {
  for (const child of from.nodes?.slice() ?? []) {
    child.remove();
    to.append(child);
  }
}

function mergeDuplicateChildren(container: Container<Node>) {
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

function serializeRoot(root: Root): string {
  return postcss.parse(root.toString()).toString();
}

const selectAndRewriteTailwindUtilities: CssCodemodTransform = (file, api) => {
  const [classNames, outputSelector] = file.path.split("\0");
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return serializeRoot(postcss.root({ nodes: [createEmptyRule(outputSelector)] }));
  }

  const compiledRoot = api.parse(file.source);
  const rewrittenRoot = cloneMatchingRulesInClassOrder(compiledRoot, classTokens, outputSelector);
  return serializeRoot(rewrittenRoot);
};

export async function compileTailwindUtilities(classNames: string): Promise<string> {
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return "";
  }

  const compiler = await compile(TAILWIND_ENTRYPOINT, {
    base: process.cwd(),
    onDependency: () => {},
  });

  return compiler.build(classTokens);
}

export function replaceTailwindSelectors(
  compiledCss: string,
  classNames: string,
  outputSelector: string,
): string {
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return serializeRoot(postcss.root({ nodes: [createEmptyRule(outputSelector)] }));
  }

  return runCssCodemod(compiledCss, selectAndRewriteTailwindUtilities, {
    path: `${classTokens.join(" ")}\0${outputSelector}`,
  });
}

export function finalizeTailwindCss(rewrittenCss: string): string {
  const rewrittenRoot = postcss.parse(rewrittenCss);
  mergeDuplicateChildren(rewrittenRoot);

  if (rewrittenRoot.first) {
    rewrittenRoot.first.raws.before = "";
  }

  return serializeRoot(rewrittenRoot);
}

/**
 * Compile Tailwind utility classes and emit custom selector blocks.
 * Variant utilities (e.g. hover) are emitted as separate selector blocks.
 */
export async function compileTailwindClasses(
  classNames: string,
  outputSelector: string = ".output",
): Promise<string> {
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return serializeRoot(postcss.root({ nodes: [createEmptyRule(outputSelector)] }));
  }

  const compiledCss = await compileTailwindUtilities(classNames);
  const rewrittenCss = replaceTailwindSelectors(compiledCss, classNames, outputSelector);
  return finalizeTailwindCss(rewrittenCss);
}
