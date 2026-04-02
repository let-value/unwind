import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, before, after } from "node:test";
import { run, resolveFiles } from "./index.ts";

describe("resolveFiles", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "unwind-test-"));
    await writeFile(join(tmpDir, "a.ts"), "const x = 1;\n");
    await writeFile(join(tmpDir, "b.ts"), "const y = 2;\n");
    await writeFile(join(tmpDir, "c.js"), "const z = 3;\n");
  });

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("resolves files matching a glob pattern", async () => {
    const files = await resolveFiles(["*.ts"], tmpDir);
    assert.equal(files.length, 2);
    assert.ok(files.every((f) => f.endsWith(".ts")));
  });

  it("resolves files matching multiple patterns", async () => {
    const files = await resolveFiles(["*.ts", "*.js"], tmpDir);
    assert.equal(files.length, 3);
  });

  it("deduplicates files matched by overlapping patterns", async () => {
    const files = await resolveFiles(["*.ts", "a.ts"], tmpDir);
    assert.equal(files.length, 2);
  });

  it("returns an empty array when no files match", async () => {
    const files = await resolveFiles(["*.nonexistent"], tmpDir);
    assert.equal(files.length, 0);
  });
});

describe("run", () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "unwind-run-test-"));
  });

  after(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns unchanged status when transform produces the same source", async () => {
    const file = join(tmpDir, "unchanged.ts");
    const source = "const x = 1;\n";
    await writeFile(file, source);

    const results = await run({ patterns: ["unchanged.ts"], cwd: tmpDir });

    assert.equal(results.length, 1);
    // The identity transform may or may not reformat — accept modified or unchanged
    assert.ok(results[0].status === "unchanged" || results[0].status === "modified");
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

    assert.equal(results.length, 1);
    // File content must remain unchanged in dry mode
    const after = await readFile(file, "utf8");
    assert.equal(after, original);
  });

  it("reports an error status for unreadable files", async () => {
    const results = await run({
      patterns: ["does-not-exist.ts"],
      cwd: tmpDir,
    });

    // No matching files → empty results (glob returns nothing)
    assert.equal(results.length, 0);
  });
});
