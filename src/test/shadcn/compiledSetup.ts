import { fileURLToPath } from "node:url";
import { writeFile, readFile, readdir, mkdir } from "node:fs/promises";
import { basename } from "node:path";
import { transformMany } from "../../transform.ts";
import { resolveShadcnProject } from "../../shadcn.ts";
import { getCssModulePath } from "../../classnames.ts";

const uiDir = fileURLToPath(new URL("./project/src/components/ui", import.meta.url));
const compiledDir = fileURLToPath(new URL("./compiled", import.meta.url));
const globalCssPath = `${compiledDir}/globals.css`;

const entries = await readdir(uiDir);
const componentFiles = entries.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

const firstSrc = `${uiDir}/${componentFiles[0]}`;
const project = await resolveShadcnProject(firstSrc);

await mkdir(compiledDir, { recursive: true });

const { results, global } = await transformMany(
  await Promise.all(
    componentFiles.map(async (file) => ({
      path: `${compiledDir}/${file}`,
      source: await readFile(`${uiDir}/${file}`, "utf-8"),
      css: project?.css,
      base: project?.base,
    })),
  ),
);

for (const result of results) {
  const cssModulePath = getCssModulePath(result.path);
  await writeFile(result.path, result.root.toSource(), "utf-8");
  await writeFile(cssModulePath, result.local.toString(), "utf-8");
  console.log(`compiled ${basename(result.path)}`);
}

const globalCss = global.toString();
if (globalCss) {
  await writeFile(globalCssPath, globalCss, "utf-8");
  console.log("wrote globals.css");
}
