import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { run, resolveFiles } from "./index.ts";

describe("resolveFiles", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "unwind-test-"));
    await writeFile(join(tmpDir, "a.ts"), "const x = 1;\n");
    await writeFile(join(tmpDir, "b.ts"), "const y = 2;\n");
    await writeFile(join(tmpDir, "c.js"), "const z = 3;\n");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("resolves files matching a glob pattern", async () => {
    const files = await resolveFiles(["*.ts"], tmpDir);
    expect(files).toHaveLength(2);
    expect(files.every((file) => file.endsWith(".ts"))).toBe(true);
  });

  it("resolves files matching multiple patterns", async () => {
    const files = await resolveFiles(["*.ts", "*.js"], tmpDir);
    expect(files).toHaveLength(3);
  });

  it("deduplicates files matched by overlapping patterns", async () => {
    const files = await resolveFiles(["*.ts", "a.ts"], tmpDir);
    expect(files).toHaveLength(2);
  });

  it("returns an empty array when no files match", async () => {
    const files = await resolveFiles(["*.nonexistent"], tmpDir);
    expect(files).toHaveLength(0);
  });
});

describe("run", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "unwind-run-test-"));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns unchanged status when transform produces the same source", async () => {
    const file = join(tmpDir, "unchanged.ts");
    const source = "const x = 1;\n";
    await writeFile(file, source);

    const results = await run({ patterns: ["unchanged.ts"], cwd: tmpDir });

    expect(results).toHaveLength(1);
    expect(["unchanged", "modified"]).toContain(results[0].status);
  });

  it("does not write files in dry-run mode", async () => {
    const file = join(tmpDir, "dry.ts");
    const original = "const  x=1;\n";
    await writeFile(file, original);

    const results = await run({
      patterns: ["dry.ts"],
      cwd: tmpDir,
      dry: true,
    });

    expect(results).toHaveLength(1);
    expect(await readFile(file, "utf8")).toBe(original);
  });

  it("reports an error status for unreadable files", async () => {
    const results = await run({
      patterns: ["does-not-exist.ts"],
      cwd: tmpDir,
    });

    expect(results).toHaveLength(0);
  });
});
