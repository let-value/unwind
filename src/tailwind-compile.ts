import { compile } from "@tailwindcss/node";
import postcss, { type AtRule, type Container, type Node, type Root, type Rule } from "postcss";
import selectorParser, { type Selector } from "postcss-selector-parser";

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

function cloneMatchingRulesInClassOrder(
  root: Root,
  classTokens: string[],
  outputSelector: string,
): Root {
  const utilityClassNames = new Set(classTokens);
  const selectedRulesByClassName = new Map<string, Rule>();
  const rewrittenRoot = postcss.root();
  const outputTemplate = createSelectorTemplate(outputSelector);

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
        outputTemplate,
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

function createRootWithEmptyRule(selector: string): Root {
  return postcss.root({ nodes: [createEmptyRule(selector)] });
}

function parseCss(source: string): Root {
  const result = postcss([]).process(source, {
    from: undefined,
  });
  const { root } = result;

  if ((result as { error?: Error }).error) {
    throw (result as { error: Error }).error;
  }

  if (root?.type !== "root") {
    throw new Error(`Unexpected root node: ${String(root)}`);
  }

  return root;
}

function selectAndRewriteTailwindUtilitiesAst(
  compiledRoot: Root,
  classNames: string,
  outputSelector: string,
): Root {
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return createRootWithEmptyRule(outputSelector);
  }

  return cloneMatchingRulesInClassOrder(compiledRoot, classTokens, outputSelector);
}

async function compileTailwindClassesAst(
  classNames: string,
  outputSelector: string,
): Promise<Root> {
  const classTokens = normalizeClassTokens(classNames);

  if (classTokens.length === 0) {
    return createRootWithEmptyRule(outputSelector);
  }

  const compiler = await compile(TAILWIND_ENTRYPOINT, {
    base: process.cwd(),
    onDependency: () => { },
  });
  const compiledRoot = parseCss(compiler.build(classTokens));
  const rewrittenRoot = selectAndRewriteTailwindUtilitiesAst(
    compiledRoot,
    classNames,
    outputSelector,
  );

  mergeDuplicateChildren(rewrittenRoot);

  if (rewrittenRoot.first) {
    rewrittenRoot.first.raws.before = "";
  }

  return rewrittenRoot;
}

/**
 * Compile Tailwind utility classes and emit custom selector blocks.
 * Variant utilities (e.g. hover) are emitted as separate selector blocks.
 */
export async function compileTailwindClasses(
  classNames: string,
  outputSelector: string = ".output",
): Promise<string> {
  return (await compileTailwindClassesAst(classNames, outputSelector)).toString();
}
