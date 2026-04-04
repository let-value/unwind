import type { Breadcrumb, ExtractedClassName } from "./classnames.ts";
import { extractClassNameTokens } from "./classnames.ts";

export interface TransformTarget {
  classNames: string;
  selectorName: string;
  outputSelector: string;
  source: ExtractedClassName["source"];
  breadcrumbs: Breadcrumb[];
}

interface SelectorSeed {
  entry: ExtractedClassName;
  index: number;
  baseWords: string[];
  valueWords: string[];
}

const OMITTED_NAME_WORDS = new Set([
  "class",
  "classname",
  "classnames",
  "cva",
  "variant",
  "variants",
]);

const BOOLEAN_PREFIXES = new Set(["is", "has", "had", "can", "should", "will", "did", "does"]);

function splitWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function dedupeWords(words: Iterable<string>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const word of words) {
    if (!word || seen.has(word)) {
      continue;
    }

    seen.add(word);
    deduped.push(word);
  }

  return deduped;
}

function normalizeNameWords(name: string): string[] {
  const rawWords = splitWords(name);
  const withoutBooleanPrefix =
    rawWords.length > 1 && BOOLEAN_PREFIXES.has(rawWords[0]) ? rawWords.slice(1) : rawWords;
  const filteredWords = withoutBooleanPrefix.filter((word) => !OMITTED_NAME_WORDS.has(word));

  return dedupeWords(filteredWords.length > 0 ? filteredWords : withoutBooleanPrefix);
}

function getBreadcrumbWords(breadcrumb: Breadcrumb): string[] {
  switch (breadcrumb.kind) {
    case "variable":
    case "function":
    case "variant":
    case "classNames":
    case "condition":
      return breadcrumb.name ? normalizeNameWords(breadcrumb.name) : [];
    case "compoundVariants":
      return ["compound"];
    default:
      return [];
  }
}

function getBaseSelectorWords(entry: ExtractedClassName): string[] {
  const words = dedupeWords(entry.breadcrumbs.flatMap(getBreadcrumbWords));
  if (words.length > 0) {
    return words;
  }

  return entry.source === "cva" ? ["cva"] : ["class"];
}

function getValueSelectorWords(classNames: string): string[] {
  return dedupeWords(
    extractClassNameTokens([classNames]).flatMap((token) =>
      splitWords(token).filter((word) => !OMITTED_NAME_WORDS.has(word)),
    ),
  );
}

function toSelectorName(words: Iterable<string>): string {
  return dedupeWords(words).join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function createSelectorSeed(entry: ExtractedClassName, index: number): SelectorSeed {
  return {
    entry,
    index,
    baseWords: getBaseSelectorWords(entry),
    valueWords: getValueSelectorWords(entry.value),
  };
}

function findUniqueSelectorName(
  seed: SelectorSeed,
  usedNames: Set<string>,
  requireValueWord: boolean,
): string {
  const candidates: string[] = [];

  if (!requireValueWord) {
    candidates.push(toSelectorName(seed.baseWords));
  }

  for (let size = 1; size <= seed.valueWords.length; size++) {
    candidates.push(toSelectorName([...seed.baseWords, ...seed.valueWords.slice(0, size)]));
  }

  candidates.push(toSelectorName(seed.valueWords));
  candidates.push(toSelectorName([...seed.baseWords, String(seed.index + 1)]));
  candidates.push(`class-${seed.index + 1}`);

  for (const candidate of candidates) {
    if (!candidate || usedNames.has(candidate)) {
      continue;
    }

    usedNames.add(candidate);
    return candidate;
  }

  const fallbackBase = toSelectorName(seed.baseWords) || "class";
  let suffix = 2;

  while (usedNames.has(`${fallbackBase}-${suffix}`)) {
    suffix++;
  }

  const fallback = `${fallbackBase}-${suffix}`;
  usedNames.add(fallback);
  return fallback;
}

export function createTransformTargets(extracted: ExtractedClassName[]): TransformTarget[] {
  const seeds = extracted.map(createSelectorSeed);
  const groups = new Map<string, SelectorSeed[]>();

  for (const seed of seeds) {
    const baseName = toSelectorName(seed.baseWords) || "class";
    const group = groups.get(baseName);

    if (group) {
      group.push(seed);
    } else {
      groups.set(baseName, [seed]);
    }
  }

  const selectorNamesByIndex = new Map<number, string>();
  const usedNames = new Set<string>();

  for (const group of groups.values()) {
    const requireValueWord = group.length > 1;

    for (const seed of group) {
      selectorNamesByIndex.set(
        seed.index,
        findUniqueSelectorName(seed, usedNames, requireValueWord),
      );
    }
  }

  return extracted.map((entry, index) => {
    const selectorName = selectorNamesByIndex.get(index) ?? `class-${index + 1}`;

    return {
      classNames: entry.value,
      selectorName,
      outputSelector: `.${selectorName}`,
      source: entry.source,
      breadcrumbs: entry.breadcrumbs,
    };
  });
}
