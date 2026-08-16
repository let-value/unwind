import { spawn } from "node:child_process";
import { access, cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const cliPath = fileURLToPath(new URL("../cli.ts", import.meta.url));
const fixtureProjectPath = fileURLToPath(new URL("./shadcn/project", import.meta.url));
// The fixture's node_modules links are relative to its own depth in the
// workspace, so a copy only resolves its dependencies as a sibling of it.
async function copyFixtureProject(): Promise<{
  projectPath: string;
  cleanup: () => Promise<void>;
}> {
  const projectPath = await mkdtemp(`${fixtureProjectPath}-tmp-`);

  await cp(fixtureProjectPath, projectPath, { recursive: true });

  return {
    projectPath,
    cleanup: () => rm(projectPath, { recursive: true, force: true }),
  };
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
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("no-args mode compiles shadcn ui components and rewrites the configured global css", async () => {
  const { projectPath, cleanup } = await copyFixtureProject();

  try {
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
      const source = await readFile(join(uiPath, file), "utf-8");

      // Components without a single class name produce no stylesheet.
      if (!source.includes("styles[")) {
        await expect(access(join(uiPath, moduleFile))).rejects.toThrow();
        continue;
      }

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
    expect(globalCssAfterFirstRun).not.toContain('@import "tailwindcss";');

    const secondRunResult = await runCli(projectPath);

    expect(secondRunResult.code).toBe(0);
    expect(secondRunResult.stderr).toBe("");
    expect(secondRunResult.stdout).toContain("file(s) transformed");

    expect(moduleCssAfterFirstRun.size).toBeGreaterThan(0);

    for (const [moduleFile, moduleCss] of moduleCssAfterFirstRun) {
      expect(await readFile(join(uiPath, moduleFile), "utf-8")).toBe(moduleCss);
    }

    const buttonSourceAfterSecondRun = await readFile(join(uiPath, "button.tsx"), "utf-8");
    expect(buttonSourceAfterSecondRun).toBe(buttonSourceAfterFirstRun);

    const globalCssAfterSecondRun = await readFile(join(projectPath, "src/index.css"), "utf-8");
    expect(globalCssAfterSecondRun).toBe(globalCssAfterFirstRun);
  } finally {
    await cleanup();
  }
}, 120_000);

test("no-args mode preserves existing module css for partially converted files", async () => {
  const { projectPath, cleanup } = await copyFixtureProject();

  try {
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
    await cleanup();
  }
}, 120_000);
