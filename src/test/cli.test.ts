import { spawn } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const cliPath = fileURLToPath(new URL("../cli.ts", import.meta.url));
const fixtureProjectPath = fileURLToPath(new URL("./shadcn/project", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

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

test(
  "no-args mode compiles shadcn ui components and rewrites the configured global css",
  async () => {
    const tempParent = join(repoRoot, ".vitest-attachments");
    await mkdir(tempParent, { recursive: true });
    const tempRoot = await mkdtemp(join(tempParent, "unwind-cli-"));
    const projectPath = join(tempRoot, "project");

    try {
      await cp(fixtureProjectPath, projectPath, { recursive: true });

      const uiPath = join(projectPath, "src/components/ui");
      const uiEntries = await readdir(uiPath);
      const componentFiles = uiEntries.filter((entry) => /\.(t|j)sx?$/.test(entry)).sort();

      const result = await runCli(projectPath);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("file(s) transformed");

      for (const file of componentFiles) {
        const moduleFile = file.replace(/\.[^.]+$/, ".module.css");
        await access(join(uiPath, moduleFile));
        expect(await readFile(join(uiPath, moduleFile), "utf-8")).not.toBe("");
        await expect(access(join(uiPath, moduleFile.replace(/\.module\.css$/, ".global.css")))).rejects.toThrow();
      }

      const buttonSource = await readFile(join(uiPath, "button.tsx"), "utf-8");
      expect(buttonSource).toContain(`import styles from "./button.module.css"`);
      expect(buttonSource).toContain(`styles["button"]`);

      const globalCss = await readFile(join(projectPath, "src/index.css"), "utf-8");
      expect(globalCss).toContain("/*! tailwindcss");
      expect(globalCss).not.toContain('@import "tailwindcss";');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  },
  120_000,
);
