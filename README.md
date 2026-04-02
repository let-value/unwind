# unwind

A CLI codemod tool powered by [jscodeshift](https://github.com/facebook/jscodeshift).

## Requirements

- Node.js 22+

## Usage

```sh
unwind <glob> [<glob> ...] [--dry]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<glob>` | One or more glob patterns matching the files to transform. |

### Options

| Flag | Description |
|------|-------------|
| `-d, --dry` | Dry run — report changes without writing to disk. |
| `-h, --help` | Show the help message. |

### Examples

```sh
# Codemod all files under components/ui/
unwind "components/ui/**/*"

# Dry run over multiple patterns
unwind "src/**/*.ts" "src/**/*.tsx" --dry
```

## Development

```sh
# Install dependencies
npm install

# Build (bundles to dist/ with tsdown)
npm run build

# Run tests (Node.js built-in test runner)
npm test

# Lint (oxlint)
npm run lint

# Format (oxfmt)
npm run format
```

## Adding transforms

Edit `src/transform.ts` to implement your codemod logic using the
[jscodeshift API](https://github.com/facebook/jscodeshift#jscodeshift-api).
