# Copilot Instructions for git-forensics-mcp

## Repository Overview

**git-forensics-mcp** is a TypeScript npm package providing a Model Context Protocol (MCP) server for git repository forensics analysis. Single-file implementation (src/index.ts, 627 lines) with 4 analysis tools: branch overview, time period analysis, file changes tracking, and merge recommendations.

- **Package manager**: **pnpm 9+ ONLY** (never npm/yarn)
- **Runtime**: Node.js 20+, TypeScript strict mode, ESM modules
- **No tests**: No test infrastructure exists

## Build Commands (Always in This Order)

### 1. Install (Required First)

```bash
npm install -g pnpm@9              # If pnpm not installed
pnpm install --frozen-lockfile     # Install deps (~648 packages, 5-10s)
```

### 2. Format Code (Required Before Build)

```bash
pnpm format                        # Auto-format all files (Prettier)
pnpm format:check                  # Check only (for CI)
```

### 3. Build

```bash
pnpm build                         # Compile src/ → build/ (~2-3s)
```

**Build outputs**: build/index.js (executable), build/index.d.ts, build/index.js.map

**Clean build**: `rm -rf build/ && pnpm build`

## Project Structure

```
git-forensics-mcp/
├── src/index.ts           # Entire server (627 lines, single file)
├── build/                 # Compiled output (gitignored)
├── .github/workflows/     # CI: release.yml, publish.yml, claude*.yml
├── .husky/pre-commit      # Hooks: commitlint + prettier + gitleaks
├── package.json           # Scripts + deps (no test script)
├── tsconfig.json          # Strict TypeScript config
├── nx.json                # Release automation (conventional commits)
└── prettier.config.cjs    # Single quotes, 100 char width
```

**Key files**:

- **src/index.ts**: GitAnalysisServer class, 4 MCP tools, uses execSync for git commands
- **nx.json**: Auto-versioning on main push based on conventional commits
- **.husky/pre-commit**: Auto-formats staged files, validates commits

**Config**: Single quotes, 100 width, trailing commas ES5, strict TS all flags on

## GitHub Workflows

### release.yml

- **Trigger**: Push to main (excluding package.json/CHANGELOG.md)
- **Actions**: Install pnpm 9 + Node 20 → `pnpm install --frozen-lockfile` → Analyze commits → Version bump → Git tag → GitHub release (no npm publish)
- **Secret**: GH_RELEASE_TOKEN

### publish.yml

- **Trigger**: GitHub release created
- **Actions**: Install deps → `pnpm build` → Publish to npmjs.org with provenance
- **Secret**: NPM_TOKEN

### Conventional Commits (Required)

Format enforced by commitlint: `<type>: <subject>`

**Triggers release**:

- `feat:` → minor bump (0.5.2 → 0.6.0)
- `fix:`, `docs:`, `refactor:`, `perf:` → patch bump (0.5.2 → 0.5.3)

**No release**: `test:`, `chore:`, `ci:`, `build:`

**Breaking change**: Add `!` or `BREAKING CHANGE:` footer → major bump

## Common Issues & Solutions

**"pnpm: command not found"** → `npm install -g pnpm@9`

**Pre-commit fails "Docker not found"** → Expected. Gitleaks scan is optional, hook continues.

**`pnpm tools:list` fails/timeouts** → EXPECTED. Server waits for MCP JSON-RPC input. If `pnpm build` succeeds, code is fine.

**Nx shows "fatal: ambiguous argument 'main'"** → Ignore. Nx can't find main in feature branch. Commands still work.

**"Nx Cloud client failed to download"** → Harmless warning. Nx Cloud optional.

**Build directory in git status** → Already in .gitignore. If visible: `git rm -r --cached build/`

## Development Workflow

1. Make changes to src/index.ts
2. `pnpm format` (required before build)
3. `pnpm build` (verify success)
4. Commit (hooks auto-run)

**Adding deps**: `pnpm add <pkg>` → commit pnpm-lock.yaml

**Generated files (don't edit)**: CHANGELOG.md (gitignored), build/**, node_modules/**

## Architecture Notes

- **Single file**: src/index.ts (627 lines) = entire GitAnalysisServer class + 4 MCP tools
- **Sync execution**: Uses `execSync` for git (intentional - git is fast)
- **File output**: Tools write JSON files (handles large results vs MCP protocol limits)
- **Error handling**: Missing params → McpError; git failures → {isError: true}
- **No tests**: No test infrastructure. Validate via: manual testing + TypeScript strict mode

**Git command pattern**:

```typescript
execSync(`cd "${repoPath}" && git <command>`, { encoding: 'utf8' }).trim();
```

**Tool flow**: Validate params → Execute git commands → Analyze data → Write JSON file → Return success

## Trust These Instructions

All commands validated by execution. Only search if you encounter undocumented errors or need specific code implementation details.
