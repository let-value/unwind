import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const SHADCN_REGISTRY_BASE_URL = "https://ui.shadcn.com/r";
const SHADCN_CONFIG_URL = `${SHADCN_REGISTRY_BASE_URL}/config.json`;

export interface ComponentsJsonTailwindConfig {
  css?: string;
  config?: string;
  baseColor?: string;
  cssVariables?: boolean;
  prefix?: string;
}

export interface ComponentsJsonConfig {
  style?: string;
  iconLibrary?: string;
  font?: string;
  fontHeading?: string;
  menuColor?: string;
  menuAccent?: string;
  rtl?: boolean;
  tailwind?: ComponentsJsonTailwindConfig;
  [key: string]: unknown;
}

export interface ShadcnPresetDefinition {
  name: string;
  base?: string;
  style?: string;
  baseColor?: string;
  theme?: string;
  chartColor?: string;
  iconLibrary?: string;
  font?: string;
  fontHeading?: string;
  menuColor?: string;
  menuAccent?: string;
  radius?: string;
  rtl?: boolean;
}

export interface TailwindShadcnMetadata {
  style?: string;
  baseColor?: string;
  iconLibrary?: string;
  font?: string;
  fontHeading?: string;
  preset?: ShadcnPresetDefinition;
  defaultTailwindCssPath?: string;
  defaultTailwindCssSource?: string;
  originalIndexCssSource?: string;
}

const jsonCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string): Promise<T | undefined> {
  const cached = jsonCache.get(url);

  if (cached) {
    return cached as Promise<T>;
  }

  const pending = (async () => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed for ${url}: ${response.status}`);
    }

    return response.json() as Promise<T>;
  })();

  jsonCache.set(url, pending);

  try {
    return await pending;
  } catch {
    jsonCache.delete(url);
    return undefined;
  }
}

async function resolveDefaultTailwindCss(projectRoot: string): Promise<{
  path?: string;
  source?: string;
}> {
  try {
    const require = createRequire(join(projectRoot, "package.json"));
    const presetEntryPath = require.resolve("shadcn/preset");
    const defaultTailwindCssPath = resolve(dirname(presetEntryPath), "../tailwind.css");

    return {
      path: defaultTailwindCssPath,
      source: await readFile(defaultTailwindCssPath, "utf8"),
    };
  } catch {
    return {};
  }
}

async function resolvePresetDefinition(styleName: string): Promise<ShadcnPresetDefinition | undefined> {
  const config = await fetchJson<{ presets?: ShadcnPresetDefinition[] }>(SHADCN_CONFIG_URL);
  const normalizedStyleName = styleName.toLowerCase();
  const presets = config?.presets ?? [];

  return presets.find((preset) => preset.name.toLowerCase() === normalizedStyleName)
    ?? presets.find((preset) => `${preset.base}-${preset.style}`.toLowerCase() === normalizedStyleName)
    ?? presets.find((preset) => preset.style?.toLowerCase() === normalizedStyleName);
}

async function readConfiguredTailwindCssEntry(
  projectRoot: string,
  componentsJson: ComponentsJsonConfig,
): Promise<string | undefined> {
  const cssEntryRelativePath = componentsJson.tailwind?.css;

  if (typeof cssEntryRelativePath !== "string" || cssEntryRelativePath.length === 0) {
    return undefined;
  }

  try {
    return await readFile(resolve(projectRoot, cssEntryRelativePath), "utf8");
  } catch {
    return undefined;
  }
}

export async function resolveOriginalShadcnIndexCssFromConfig(
  projectRoot: string,
  componentsJson: ComponentsJsonConfig,
): Promise<string | undefined> {
  return readConfiguredTailwindCssEntry(projectRoot, componentsJson);
}

export async function resolveOriginalShadcnIndexCssFromComponentsJsonPath(
  componentsJsonPath: string,
): Promise<string | undefined> {
  const componentsJson = JSON.parse(await readFile(componentsJsonPath, "utf8")) as ComponentsJsonConfig;
  return resolveOriginalShadcnIndexCssFromConfig(dirname(componentsJsonPath), componentsJson);
}

export async function resolveShadcnProjectMetadata(
  projectRoot: string,
  componentsJson: ComponentsJsonConfig,
): Promise<TailwindShadcnMetadata | undefined> {
  const defaultTailwindCss = await resolveDefaultTailwindCss(projectRoot);
  const styleName = typeof componentsJson.style === "string" ? componentsJson.style : undefined;
  const preset = styleName ? await resolvePresetDefinition(styleName) : undefined;
  const basicMetadata: TailwindShadcnMetadata = {
    style: styleName,
    baseColor: typeof componentsJson.tailwind?.baseColor === "string"
      ? componentsJson.tailwind.baseColor
      : undefined,
    iconLibrary: typeof componentsJson.iconLibrary === "string"
      ? componentsJson.iconLibrary
      : undefined,
    font: typeof componentsJson.font === "string" ? componentsJson.font : preset?.font,
    fontHeading: typeof componentsJson.fontHeading === "string"
      ? componentsJson.fontHeading
      : preset?.fontHeading,
    preset,
    defaultTailwindCssPath: defaultTailwindCss.path,
    defaultTailwindCssSource: defaultTailwindCss.source,
    originalIndexCssSource: await readConfiguredTailwindCssEntry(projectRoot, componentsJson),
  };

  return Object.values(basicMetadata).some((value) => value !== undefined) ? basicMetadata : undefined;
}
