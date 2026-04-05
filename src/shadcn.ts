import { resolve } from "node:path";
import { z } from "zod";
import { walkUp } from "./utils.ts";
import resolver from "oxc-resolver";

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
  components: ComponentsConfig;
}

export async function resolveShadcnProject(path: string) {
  let root: string | undefined;
  let config: ComponentsConfig | undefined;
  for (const segment of walkUp(path)) {
    let json: string;
    try {
      const path = resolve(segment, "components.json");
      json = await import(path);
    } catch {
      continue;
    }

    config = await schema.parseAsync(json);
    root = segment;
    break;
  }

  if (!root || !config) {
    return;
  }

  const css = resolver.sync(root, config.tailwind.css);
  if (css.error) {
    throw new Error(`Failed to resolve tailwind css file at ${config.tailwind.css} from ${root}`);
  }
  const components = resolver.sync(root, config.aliases.components);
  const utils = resolver.sync(root, config.aliases.utils);
  const ui = config.aliases.ui ? resolver.sync(root, config.aliases.ui) : undefined;
  const lib = config.aliases.lib ? resolver.sync(root, config.aliases.lib) : undefined;
  const hooks = config.aliases.hooks ? resolver.sync(root, config.aliases.hooks) : undefined;

  return config;
}
