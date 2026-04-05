import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { walkUp } from "./utils.ts";
import { ResolverFactory } from "oxc-resolver";
import assert from "node:assert";

export const schema = z.object({
  style: z.string(),
  tailwind: z.object({
    config: z.string(),
    css: z.string(),
    baseColor: z.string(),
    cssVariables: z.boolean(),
    prefix: z.string().optional(),
  }),
  iconLibrary: z.string().optional(),
  aliases: z.object({
    utils: z.string(),
    components: z.string(),
    ui: z.string().optional(),
    lib: z.string().optional(),
    hooks: z.string().optional(),
  }),
  rtl: z.boolean().optional(),
});

export type ComponentsConfig = z.infer<typeof schema>;

export interface ShadcnMetadata {
  packageJsonPath: string;
  componentsJsonPath: string;
  componentsJson: ComponentsConfig;
  cssPath: string;
  css: string;
  componentsPath: string;
  uiPath?: string;
}

const file = new ResolverFactory({ tsconfig: "auto" });
const context = file.cloneWithOptions({ tsconfig: "auto", resolveToContext: true });

export async function resolveShadcnProject(
  searchPath: string,
): Promise<ShadcnMetadata | undefined> {
  let dir: string | undefined;
  let config: ComponentsConfig | undefined;
  let componentsJsonPath: string | undefined;
  for (const segment of walkUp(searchPath)) {
    const location = resolve(segment, "components.json");
    let json: string;
    try {
      json = await import(location);
    } catch {
      continue;
    }

    config = await schema.parseAsync(json);
    dir = segment;
    componentsJsonPath = location;
    break;
  }

  if (!dir || !config || !componentsJsonPath) {
    return;
  }

  const css = file.resolveFileSync(componentsJsonPath, config.tailwind.css);
  assert(css.path, "Failed to resolve Tailwind CSS entry point");
  assert(css.packageJsonPath, "Failed to resolve Tailwind CSS entry point package.json");

  const components = context.resolveFileSync(componentsJsonPath, config.aliases.components);
  assert(components.path, "Failed to resolve components directory");

  const ui = config.aliases.ui
    ? context.resolveFileSync(componentsJsonPath, config.aliases.ui)
    : undefined;

  return {
    packageJsonPath: css.packageJsonPath,
    componentsJsonPath,
    componentsJson: config,
    cssPath: css.path,
    css: await readFile(css.path, "utf8"),
    componentsPath: components.path,
    uiPath: ui?.path,
  };
}
