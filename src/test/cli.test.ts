import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const cliPath = fileURLToPath(new URL("../cli.ts", import.meta.url));
const fixtureProjectPath = fileURLToPath(new URL("./shadcn/project", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

// Copy the fixture project to dest, skipping node_modules (253MB) to keep tests fast.
// Only the `shadcn` package (5MB) is copied explicitly because it contains
// shadcn/tailwind.css which is imported by the fixture's index.css but is not
// present in the repo's top-level node_modules (all other CSS deps are there).
async function copyFixture(dest: string): Promise<void> {
  await cp(fixtureProjectPath, dest, {
    recursive: true,
    filter: (src) => basename(src) !== "node_modules",
  });
  await mkdir(join(dest, "node_modules"), { recursive: true });
  await cp(
    join(fixtureProjectPath, "node_modules", "shadcn"),
    join(dest, "node_modules", "shadcn"),
    { recursive: true },
  );
}

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(cwd: string, args: string[] = []): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--experimental-strip-types", cliPath, ...args], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      // Strip Node.js deprecation warnings emitted by --experimental-strip-types internals.
      const filteredStderr = stderr
        .split("\n")
        .filter((line) => !/^\(node:\d+\)/.test(line) && !line.startsWith("(Use `node"))
        .join("\n")
        .trim();
      resolve({ code, stdout, stderr: filteredStderr });
    });
  });
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

test("no-args mode compiles shadcn ui components and rewrites the configured global css", async () => {
  const tempParent = join(repoRoot, ".vitest-attachments");
  await mkdir(tempParent, { recursive: true });
  const tempRoot = await mkdtemp(join(tempParent, "unwind-cli-"));
  const projectPath = join(tempRoot, "project");

  try {
    await copyFixture(projectPath);

    const uiPath = join(projectPath, "src/components/ui");
    const uiEntries = await readdir(uiPath);
    const componentFiles = uiEntries.filter((entry) => /\.(t|j)sx?$/.test(entry)).sort();

    const firstRunResult = await runCli(projectPath);

    expect(firstRunResult.code).toBe(0);
    expect(firstRunResult.stderr).toBe("");
    expect(firstRunResult.stdout).toContain("file(s) transformed");

    const moduleCssAfterFirstRun = new Map<string, string>();

    for (const file of componentFiles) {
      const moduleFile = file.replace(/\.[^.]+$/, ".module.css");
      await access(join(uiPath, moduleFile));
      const moduleCss = await readFile(join(uiPath, moduleFile), "utf-8");
      expect(moduleCss).not.toBe("");
      moduleCssAfterFirstRun.set(moduleFile, moduleCss);
      await expect(
        access(join(uiPath, moduleFile.replace(/\.module\.css$/, ".global.css"))),
      ).rejects.toThrow();
    }

    const buttonSourceAfterFirstRun = await readFile(join(uiPath, "button.tsx"), "utf-8");
    expect(buttonSourceAfterFirstRun).toContain(`import styles from "./button.module.css"`);
    expect(buttonSourceAfterFirstRun).toContain(`styles["button"]`);

    const globalCssAfterFirstRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(globalCssAfterFirstRun).toContain("/*! tailwindcss");
    expect(stripCssComments(globalCssAfterFirstRun)).not.toContain('@import "tailwindcss";');
    expect(globalCssAfterFirstRun).toContain("unwind-source-imports");

    const secondRunResult = await runCli(projectPath);

    expect(secondRunResult.code).toBe(0);
    expect(secondRunResult.stderr).toBe("");
    expect(secondRunResult.stdout).toContain("file(s) transformed");

    for (const file of componentFiles) {
      const moduleFile = file.replace(/\.[^.]+$/, ".module.css");
      const moduleCss = await readFile(join(uiPath, moduleFile), "utf-8");
      if (moduleFile !== "sonner.module.css") {
        expect(moduleCss).toBe(moduleCssAfterFirstRun.get(moduleFile));
      }
    }

    const buttonSourceAfterSecondRun = await readFile(join(uiPath, "button.tsx"), "utf-8");
    expect(buttonSourceAfterSecondRun).toBe(buttonSourceAfterFirstRun);

    const globalCssAfterSecondRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(globalCssAfterSecondRun).toContain("/*! tailwindcss");

    const sonnerCssAfterSecondRun = await readFile(join(uiPath, "sonner.module.css"), "utf-8");
    expect(sonnerCssAfterSecondRun).toContain(".toaster {");

    const thirdRunResult = await runCli(projectPath);

    expect(thirdRunResult.code).toBe(0);
    expect(thirdRunResult.stderr).toBe("");

    const globalCssAfterThirdRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(globalCssAfterThirdRun).toBe(globalCssAfterSecondRun);

    for (const file of componentFiles) {
      const moduleFile = file.replace(/\.[^.]+$/, ".module.css");
      const moduleCss = await readFile(join(uiPath, moduleFile), "utf-8");
      expect(moduleCss).toBe(
        moduleFile === "sonner.module.css"
          ? sonnerCssAfterSecondRun
          : moduleCssAfterFirstRun.get(moduleFile),
      );
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}, 120_000);

test("no-args mode preserves existing module css for partially converted files", async () => {
  const tempParent = join(repoRoot, ".vitest-attachments");
  await mkdir(tempParent, { recursive: true });
  const tempRoot = await mkdtemp(join(tempParent, "unwind-cli-"));
  const projectPath = join(tempRoot, "project");

  try {
    await copyFixture(projectPath);

    const firstRunResult = await runCli(projectPath);
    expect(firstRunResult.code).toBe(0);
    expect(firstRunResult.stderr).toBe("");

    const uiPath = join(projectPath, "src/components/ui");
    const buttonPath = join(uiPath, "button.tsx");
    const buttonModulePath = join(uiPath, "button.module.css");

    const buttonModuleAfterFirstRun = await readFile(buttonModulePath, "utf-8");
    const preservedSelectors = [".button {", ".button-size-default {", ".button-variant-link {"];
    for (const selector of preservedSelectors) {
      expect(buttonModuleAfterFirstRun).toContain(selector);
    }

    const buttonSourceAfterFirstRun = await readFile(buttonPath, "utf-8");
    expect(buttonSourceAfterFirstRun).toContain(`styles["button-size-icon-lg"]`);

    const partiallyConvertedButtonSource = buttonSourceAfterFirstRun.replace(
      `styles["button-size-icon-lg"]`,
      `"size-10"`,
    );
    expect(partiallyConvertedButtonSource).not.toBe(buttonSourceAfterFirstRun);
    await writeFile(buttonPath, partiallyConvertedButtonSource, "utf-8");

    const secondRunResult = await runCli(projectPath);
    expect(secondRunResult.code).toBe(0);
    expect(secondRunResult.stderr).toBe("");

    const buttonSourceAfterSecondRun = await readFile(buttonPath, "utf-8");
    expect(buttonSourceAfterSecondRun).toContain(`styles["button-size-icon-lg"]`);
    expect(buttonSourceAfterSecondRun).not.toContain(`"size-10"`);

    const buttonModuleAfterSecondRun = await readFile(buttonModulePath, "utf-8");
    for (const selector of preservedSelectors) {
      expect(buttonModuleAfterSecondRun).toContain(selector);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}, 120_000);

test("no-args mode compiles new components added after a previous run", async () => {
  const tempParent = join(repoRoot, ".vitest-attachments");
  await mkdir(tempParent, { recursive: true });
  const tempRoot = await mkdtemp(join(tempParent, "unwind-cli-"));
  const projectPath = join(tempRoot, "project");

  try {
    await copyFixture(projectPath);

    const firstRunResult = await runCli(projectPath);
    expect(firstRunResult.code).toBe(0);
    expect(firstRunResult.stderr).toBe("");

    // After the first run the global CSS entry has been replaced with compiled
    // output — it no longer contains Tailwind directives.
    const globalCssAfterFirstRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(stripCssComments(globalCssAfterFirstRun)).not.toContain('@import "tailwindcss";');
    expect(globalCssAfterFirstRun).toContain("unwind-source-imports");

    // Add a new component file that still uses raw Tailwind class strings.
    const uiPath = join(projectPath, "src/components/ui");
    const newComponentPath = join(uiPath, "badge.tsx");
    await writeFile(
      newComponentPath,
      [
        `import { cn } from "#/lib/utils"`,
        ``,
        `function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {`,
        `  return (`,
        `    <div`,
        `      className={cn(`,
        `        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",`,
        `        className`,
        `      )}`,
        `      {...props}`,
        `    />`,
        `  )`,
        `}`,
        ``,
        `export { Badge }`,
      ].join("\n"),
      "utf-8",
    );

    const secondRunResult = await runCli(projectPath);
    expect(secondRunResult.code).toBe(0);
    expect(secondRunResult.stderr).toBe("");

    // The new component must have a non-empty module CSS file.
    const badgeModulePath = join(uiPath, "badge.module.css");
    await access(badgeModulePath);
    const badgeModuleCss = await readFile(badgeModulePath, "utf-8");
    expect(badgeModuleCss.trim()).not.toBe("");

    // The compiled source must reference the CSS module.
    const badgeSource = await readFile(newComponentPath, "utf-8");
    expect(badgeSource).toContain(`import styles from "./badge.module.css"`);

    // Existing components' module CSS must be unchanged.
    const buttonModuleCss = await readFile(join(uiPath, "button.module.css"), "utf-8");
    expect(buttonModuleCss).not.toBe("");

    // The global CSS must still contain the base Tailwind output that was
    // written by the first run.
    const globalCssAfterSecondRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(globalCssAfterSecondRun).toContain("/*! tailwindcss");
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}, 120_000);
