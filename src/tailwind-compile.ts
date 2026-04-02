import { compile } from "@tailwindcss/node";

const TAILWIND_ENTRYPOINT = `@import "tailwindcss/theme";\n@import "tailwindcss/utilities";`;

interface CompiledRule {
  selector: string;
  body: string;
}

function extractFirstClassRule(css: string): CompiledRule | null {
  let index = 0;

  while (index < css.length) {
    if (css[index] !== ".") {
      index += 1;
      continue;
    }

    if (index > 0 && css[index - 1] !== "\n") {
      index += 1;
      continue;
    }

    const braceIndex = css.indexOf("{", index);
    if (braceIndex === -1) {
      break;
    }

    const selector = css.slice(index, braceIndex).trim();
    if (!selector.startsWith(".")) {
      index = braceIndex + 1;
      continue;
    }

    let depth = 0;
    let cursor = braceIndex;

    do {
      const char = css[cursor];
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      }
      cursor += 1;
    } while (cursor < css.length && depth > 0);

    const body = css.slice(braceIndex + 1, cursor - 1).trim();
    if (body.length > 0) {
      return { selector, body };
    }

    index = cursor;
  }

  return null;
}

function normalizeClassTokens(classNames: string): string[] {
  return [...new Set(classNames.split(/\s+/).map((token) => token.trim()).filter(Boolean))];
}

function normalizeVariantBody(body: string): { suffix: string; body: string } {
  const match = body.match(/^&(:[^{\s]+)\s*\{([\s\S]*)\}$/);
  if (!match) {
    return { suffix: "", body };
  }

  return {
    suffix: match[1],
    body: match[2].trim(),
  };
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
    return `${outputSelector} {\n}`;
  }

  const bodiesBySuffix = new Map<string, string[]>();

  for (const classToken of classTokens) {
    const compiler = await compile(TAILWIND_ENTRYPOINT, {
      base: process.cwd(),
      onDependency: () => {},
    });

    const compiled = compiler.build([classToken]);
    const rule = extractFirstClassRule(compiled);

    if (!rule) {
      continue;
    }

    const normalized = normalizeVariantBody(rule.body);
    const list = bodiesBySuffix.get(normalized.suffix) ?? [];
    list.push(normalized.body);
    bodiesBySuffix.set(normalized.suffix, list);
  }

  if (bodiesBySuffix.size === 0) {
    return `${outputSelector} {\n}`;
  }

  const blocks = [...bodiesBySuffix.entries()].map(([suffix, bodies]) => {
    const mergedBody = bodies.map((body) => `  ${body.replaceAll("\n", "\n  ")}`).join("\n");
    return `${outputSelector}${suffix} {\n${mergedBody}\n}`;
  });

  return blocks.join("\n\n");
}
