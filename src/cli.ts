#!/usr/bin/env node
import { parseArgs } from "node:util";
import { run } from "./index.ts";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    dry: {
      type: "boolean",
      short: "d",
      default: false,
    },
    help: {
      type: "boolean",
      short: "h",
      default: false,
    },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: unwind <glob> [<glob> ...] [--dry]

Arguments:
  <glob>     One or more glob patterns matching the files to codemod.
             Example: unwind components/ui/**/*

Options:
  -d, --dry  Dry run: report what would change without writing to disk.
  -h, --help Show this help message.
`);
  process.exit(values.help ? 0 : 1);
}

const results = await run({
  patterns: positionals,
  dry: values.dry,
});

let modified = 0;
let unchanged = 0;
let errors = 0;

for (const result of results) {
  if (result.status === "modified") {
    modified++;
    const tag = values.dry ? "[dry]" : "[modified]";
    console.log(`${tag} ${result.file}`);
  } else if (result.status === "unchanged") {
    unchanged++;
  } else if (result.status === "error") {
    errors++;
    console.error(`[error] ${result.file}: ${result.error?.message}`);
  }
}

const total = results.length;
console.log(
  `\nDone. ${total} file(s) processed: ${modified} modified, ${unchanged} unchanged, ${errors} error(s).`,
);

if (errors > 0) {
  process.exit(1);
}
