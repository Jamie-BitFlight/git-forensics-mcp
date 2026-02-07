# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- TypeScript 5.0.0+ - Single-file server implementation at `src/index.ts` with strict mode enabled

## Runtime

**Environment:**
- Node.js 20.0.0+ (required for ES2020 features and MCP SDK compatibility)

**Package Manager:**
- pnpm 9.0+ (required)
- Lockfile: `pnpm-lock.yaml` (version 9.0, managed and committed)

## Frameworks

**Core:**
- @modelcontextprotocol/sdk 1.20.1 - MCP server implementation providing `Server` class and stdio transport

**Build/Dev:**
- TypeScript 5.0.0+ - Compiler for ES2020 target with strict mode
- ts-node 10.9.2 - Runtime TypeScript execution for development
- Prettier 3.6.2 - Code formatter (100 char width, single quotes)
- Nx 21.6.5 - Monorepo tool for task orchestration and release management
- @nx/js 21.6.5 - Nx plugin for TypeScript/JavaScript builds with swc

## Key Dependencies

**Critical:**
- @modelcontextprotocol/sdk (1.20.1) - Provides MCP server framework, JSON-RPC message handling, tool registration, and stdio transport

**DevDependencies - Commit/Release:**
- commitlint 20.1.0 - Validates conventional commit format
- @commitlint/config-conventional 20.0.0 - Conventional commits ruleset
- @commitlint/cli 20.1.0 - CLI for commit linting
- husky 9.1.7 - Git hooks management (pre-commit hook at `.husky/pre-commit`)

**DevDependencies - Build/Version:**
- nx (21.6.5) - Task runner and release management
- @nx/js (21.6.5) - TypeScript compilation with SWC
- @swc/core 1.13.5 - Fast JavaScript compiler
- @swc/helpers 0.5.17 - SWC runtime helpers

**DevDependencies - Type Safety:**
- @types/node 22.0.0 - Node.js type definitions
- typescript 5.0.0 - TypeScript compiler

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2020
- Module: ES2020 (ESM)
- Module resolution: node
- Strict mode: all flags enabled
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`
  - `strictPropertyInitialization: true`
  - `noImplicitThis: true`
  - `alwaysStrict: true`
- Output: `build/` directory (with source maps)
- Source: `src/` directory

**Prettier (`prettier.config.cjs`):**
- Single quotes
- Print width: 100 characters
- Trailing commas: ES5 style

**Commit Validation (`commitlint.config.cjs`):**
- Extends `@commitlint/config-conventional`
- Enforces conventional commit format: `<type>(<scope>): <subject>`

**Nx Release (`nx.json`):**
- Conventional commits-based versioning
- GitHub release creation
- Pre-version build via `nx run-many -t build`

## Build Process

**Entry Point:** `src/index.ts` (shebang `#!/usr/bin/env node`)

**Build Command:** `pnpm build`
- Compiles TypeScript via `tsc` to `build/` directory
- Makes output executable: `chmod +x build/index.js`
- Generates type declarations and source maps

**Output:**
- `build/index.js` - Compiled MCP server (marked executable)
- `build/index.d.ts` - TypeScript type declarations

## Package Configuration

**Package.json Key Fields:**
- `"type": "module"` - ES modules only (no CommonJS)
- `"main": "build/index.js"` - Entry point for consumers
- `"bin": {"git-forensics-mcp": "./build/index.js"}` - CLI executable
- Published to npm as `@jamie-bitflight/git-forensics-mcp` with public access

## Platform Requirements

**Development:**
- Node.js 20+ required
- pnpm 9+ required
- Git (for repository analysis tool usage)
- Docker optional (for gitleaks pre-commit hook - skips gracefully if unavailable)

**Production:**
- Deployed via GitHub Actions to npm registry
- Runs as stdio-based MCP server process
- Consumes standard input/output for JSON-RPC communication

## Deployment

**Release Process:**
- Triggered automatically on push to main (skipping package.json/CHANGELOG.md-only changes)
- GitHub Actions workflow (`release.yml`) runs `nx release --skip-publish --verbose`
- Creates git tags and GitHub releases
- Publish workflow (`publish.yml`) triggered on release event
- Publishes to npm registry with Node provenance attestation

---

*Stack analysis: 2026-02-07*
