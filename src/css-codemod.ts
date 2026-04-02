import postcss, { type AcceptedPlugin, type Parser, type Root } from "postcss";
import parseValue from "postcss-value-parser";

export interface CssCodemodAPI {
  parse(source: string): Root;
  parseValue(value: string): parseValue.ParsedValue;
}

export interface CssCodemodFileInfo {
  path: string;
  source: string;
}

export type CssCodemodTransform = (
  file: CssCodemodFileInfo,
  api: CssCodemodAPI,
) => string | null;

export interface CssCodemodOptions {
  parser?: Parser;
  plugins?: AcceptedPlugin[];
  path?: string;
}

export function createCssCodemodApi({
  parser,
  plugins = [],
}: Omit<CssCodemodOptions, "path"> = {}): CssCodemodAPI {
  return {
    parse(source: string): Root {
      const result = postcss(plugins).process(source, {
        from: undefined,
        parser,
      });
      const { root } = result;

      if ((result as { error?: Error }).error) {
        throw (result as { error: Error }).error;
      }

      if (root?.type !== "root") {
        throw new Error(`Unexpected root node: ${String(root)}`);
      }

      return root;
    },
    parseValue,
  };
}

export function runCssCodemod(
  source: string,
  transform: CssCodemodTransform,
  options: CssCodemodOptions = {},
): string {
  const result = transform(
    {
      path: options.path ?? "<inline.css>",
      source,
    },
    createCssCodemodApi(options),
  );

  return result ?? source;
}
