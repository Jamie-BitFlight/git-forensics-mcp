# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- TypeScript 5.0+ - Complete codebase implementation in `src/index.ts`

## Runtime

**Environment:**
- Node.js 20+ (specified in release.yml and publish.yml workflows, implicit in package.json)

**Package Manager:**
- pnpm 9+ - Enforced via `pnpm/action-setup@v4` in CI workflows
- Lockfile: pnpm-lock.yaml (frozen-lockfile used in CI)

## Frameworks

**Core:**
- @modelcontextprotocol/sdk (latest) - MCP server framework for tool registration and stdio transport (`src/index.ts` imports Server, StdioServerTransport, ErrorCode, McpError from SDK)

**Build/Dev:**
- TypeScript Compiler (tsc) - Build target via `pnpm build` script
- Nx 21.6.5 - Project orchestration and release management (`nx.json` configured with @nx/js/typescript plugin)
- SWC (@swc/core ~1.13.5, @swc-node/register ~1.11.1) - TypeScript transpilation support

## Key Dependencies

**Critical:**
- @modelcontextprotocol/sdk (latest) - MCP protocol implementation, only production dependency

**Development Tools:**
- TypeScript ^5.0.0 - Language and compilation
- ts-node ^10.9.2 - Runtime execution via `pnpm start` script
- @types/node ^22.0.0 - Node.js type definitions
- @nx/js 21.6.5 - Nx JavaScript plugin for build management

**Quality & Release:**
- prettier ^3.6.2 - Code formatting
- husky ^9.1.7 - Git hooks (pre-commit)
- commitlint ^20.1.0 - Conventional commit validation
- @commitlint/config-conventional ^20.0.0 - Conventional commit rules
- @commitlint/cli ^20.1.0 - Commitlint CLI runner
- @commitlint/config-angular ^20.0.0 - Angular commit config (alternate)
- @commitlint/config-nx-scopes ^20.0.0 - Nx-aware scoping
- @modelcontextprotocol/inspector ^0.17.1 - MCP inspection CLI for development

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2020
- Module: ES2020
- Module Resolution: node
- Strict mode enabled: all strict flags true (noImplicitAny, strictNullChecks, strictFunctionTypes, strictPropertyInitialization, noImplicitThis, alwaysStrict)
- Declaration and source maps enabled
- Output: `build/` directory
- Input: `src/` directory

**Prettier (`prettier.config.cjs`):**
- Print width: 100 characters
- Single quotes enabled
- Trailing commas: ES5 style

**Commitlint (`commitlint.config.cjs`):**
- Extends: @commitlint/config-conventional
- Enforces conventional commit format via Husky pre-commit hook

**Nx (`nx.json`):**
- TypeScript plugin: @nx/js/typescript
- Release configuration: conventional commits enabled
- Pre-version command: `npx nx run-many -t build`
- Changelog: GitHub releases (createRelease: "github")
- Cloud integration: nxCloudId configured

## Build & Output

**Build Process:**
1. TypeScript compilation: `tsc`
2. Executable: `chmod +x build/index.js` - Makes output executable
3. Main entry: `build/index.js` (configured in package.json bin)
4. CLI command: `git-forensics-mcp` (via package.json bin field)

**Shebang:** `#!/usr/bin/env node` - Enables direct execution

## Development Commands

```bash
pnpm install              # Install with pnpm
pnpm build                # Compile TypeScript + chmod
pnpm format               # Auto-format with Prettier
pnpm format:check         # Verify formatting
pnpm start                # Run via ts-node (development)
pnpm tools:list           # List tools via MCP Inspector
pnpm nx release --dry-run # Preview release changes
```

## Pre-commit Hook (`/.husky/pre-commit`)

Runs three checks in sequence:
1. commitlint - Validates conventional commit format
2. prettier - Auto-formats staged files (with `--write` flag)
3. gitleaks - Scans for secrets via Docker (skips gracefully if Docker unavailable)
4. `git update-index --again` - Restages prettier changes

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9+
- Corepack (for pnpm management)
- Docker (optional - for pre-commit gitleaks scanning)

**Production (Distribution):**
- Published to npm as `@jamie-bitflight/git-forensics-mcp`
- Installable globally: `npm install -g @jamie-bitflight/git-forensics-mcp`
- Runs as stdio MCP server (no network binding required)

---

*Stack analysis: 2026-02-07*
