# unwind

A CLI codemod tool powered by [jscodeshift](https://github.com/facebook/jscodeshift).

## Requirements

- Node.js 22+

## Usage

```sh
unwind [<glob> ...] [options]
```

### Arguments

| Argument | Description                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `<glob>` | Optional glob patterns matching files to transform. If omitted, `unwind` auto-detects a shadcn project and transforms all UI components. |

### Options

| Flag                   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `-o, --output <dir>`   | Write output to a directory instead of in-place.  |
| `--css <path>`         | Use a specific Tailwind CSS entry file.           |
| `--import-name <name>` | CSS module import name (default: `styles`).       |
| `-d, --dry`            | Dry run - report changes without writing to disk. |
| `-h, --help`           | Show the help message.                            |

### Examples

```sh
# Codemod all files under components/ui/
unwind "components/ui/**/*"

# Dry run over multiple patterns
unwind "src/**/*.ts" "src/**/*.tsx" --dry

# No args: detect shadcn, compile all UI components, and rewrite the configured global css
unwind
```

## Development

```sh
# Install dependencies
npm install

# Build (bundles to dist/ with tsdown)
npm run build

# Run tests (Vitest)
npm test

# Lint (oxlint)
npm run lint

# Format (oxfmt)
npm run format
```

## Adding transforms

Edit `src/transform.ts` to implement your codemod logic using the
[jscodeshift API](https://github.com/facebook/jscodeshift#jscodeshift-api).
