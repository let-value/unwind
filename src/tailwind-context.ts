import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  resolveShadcnProjectMetadata,
  type ComponentsJsonConfig,
  type TailwindShadcnMetadata,
} from "./shadcn-strategy.ts";

export interface TailwindProjectContext {
  projectRoot: string;
  componentsJsonPath: string;
  componentsJson: ComponentsJsonConfig;
  tailwindCssEntryPath: string;
  tailwindCssEntrySource: string;
  shadcn?: TailwindShadcnMetadata;
}

function resolveFromCwd(pathLike: string): string {
  return isAbsolute(pathLike) ? pathLike : resolve(process.cwd(), pathLike);
}

async function findNearestComponentsJsonPath(sourceFilePath: string): Promise<string | undefined> {
  let currentDir = dirname(resolveFromCwd(sourceFilePath));

  while (true) {
    const componentsJsonPath = join(currentDir, "components.json");

    try {
      await readFile(componentsJsonPath, "utf8");
      return componentsJsonPath;
    } catch {
      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        return undefined;
      }

      currentDir = parentDir;
    }
  }
}

export async function resolveTailwindProjectContext(
  sourceFilePath: string,
): Promise<TailwindProjectContext | undefined> {
  const componentsJsonPath = await findNearestComponentsJsonPath(sourceFilePath);

  if (!componentsJsonPath) {
    return undefined;
  }

  const projectRoot = dirname(componentsJsonPath);
  const componentsJson = JSON.parse(await readFile(componentsJsonPath, "utf8")) as ComponentsJsonConfig;
  const tailwindCssEntry = componentsJson.tailwind?.css;

  if (typeof tailwindCssEntry !== "string" || tailwindCssEntry.length === 0) {
    return undefined;
  }

  const tailwindCssEntryPath = resolve(projectRoot, tailwindCssEntry);

  return {
    projectRoot,
    componentsJsonPath,
    componentsJson,
    tailwindCssEntryPath,
    tailwindCssEntrySource: await readFile(tailwindCssEntryPath, "utf8"),
    shadcn: await resolveShadcnProjectMetadata(projectRoot, componentsJson),
  };
}

export async function resolveTailwindCssEntryPath(
  sourceFilePath: string,
): Promise<string | undefined> {
  return (await resolveTailwindProjectContext(sourceFilePath))?.tailwindCssEntryPath;
}
