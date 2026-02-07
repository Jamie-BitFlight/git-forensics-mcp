# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git Forensics MCP is a Model Context Protocol (MCP) server for deep git repository analysis. Single-file TypeScript implementation (`src/index.ts`) providing four forensics tools: branch overview, time period analysis, file changes tracking, and merge recommendations. Published to npm as `@jamie-bitflight/git-forensics-mcp`.

## Build and Development Commands

**Package manager: pnpm only** (never npm/yarn). Requires pnpm 9+ and Node.js 20+.

```bash
pnpm install              # Install dependencies
pnpm build                # Compile TypeScript to build/ and chmod +x
pnpm format               # Auto-format with Prettier
pnpm format:check         # Check formatting without modifying
```

### Testing the MCP Server

This is a stdio MCP server — it cannot be run directly. Use MCP Inspector CLI mode:

```bash
pnpm tools:list           # List available tools via inspector
pnpm inspect:method tools/call --tool-name get_branch_overview \
  --tool-arg repoPath=$(pwd) --tool-arg 'branches=["main"]' \
  --tool-arg outputPath=/tmp/test.json
```

No test runner or linter is currently configured.

### Release Process

Uses Nx Release with conventional commits. Push to main triggers automatic version bump, git tag, and npm publish via GitHub Actions (release.yml → publish.yml).

```bash
pnpm nx release --dry-run       # Preview version changes
pnpm nx release --skip-publish  # Version + tag locally without publishing
```

## Architecture

### Single-Class Design

The entire server lives in `src/index.ts` as a `GitAnalysisServer` class (~627 lines):

- Registers four MCP tools with JSON Schema input definitions
- Handles `ListToolsRequestSchema` and `CallToolRequestSchema`
- Executes git commands synchronously via `execSync`
- Writes JSON analysis results to file paths (not returned directly — intentional for large results)
- Runs on stdio transport

### Tool Handler Pattern

Each tool follows: validate params → execute git commands → analyze data → write JSON to `outputPath` → return success message. Missing params throw `McpError` with `ErrorCode.InvalidParams`. Git failures return `{isError: true}`.

### Git Command Pattern

All git operations use `execSync` with `cd "${repoPath}" && git ...` and `{encoding: 'utf8'}`, parsing pipe-delimited output into typed objects.

### Analysis Capabilities

- **Commit categorization** — classifies by message prefix (feat/fix/refactor/docs/other)
- **Conflict detection** — finds overlapping time ranges across branches modifying same files
- **Risk assessment** — low/medium/high based on overlap count
- **Merge strategy** — recommends base branch (most commits) with cherry-pick approach
- **Hotspot detection** — files changed in multiple branches

## Code Style

- **Prettier**: single quotes, 100 char width, trailing commas ES5 (`prettier.config.cjs`)
- **TypeScript**: strict mode with all strict flags enabled
- **Commitlint**: conventional commits enforced (`@commitlint/config-conventional`)

### Conventional Commits

Commits must follow `<type>(<scope>): <subject>` format. Types that trigger releases: `feat` (minor), `fix`/`docs`/`refactor`/`perf` (patch). Breaking changes via `!` suffix or `BREAKING CHANGE:` footer (major). Types `test`, `chore`, `ci`, `build` do not trigger releases.

## Pre-commit Hook

The Husky pre-commit hook (`.husky/pre-commit`) runs three checks in sequence:
1. **commitlint** — validates conventional commit format
2. **prettier** — auto-formats staged files
3. **gitleaks** — scans for secrets (requires Docker; skips gracefully if Docker unavailable)

## Common Issues

- **`pnpm tools:list` hangs/times out** — Expected. The server waits for MCP JSON-RPC input. If `pnpm build` succeeds, the code is correct.
- **Pre-commit fails "Docker not found"** — Expected. Gitleaks scan is optional; the hook continues.
- **Nx "fatal: ambiguous argument 'main'"** — Harmless warning in feature branches. Commands still work.

## Additional Guidance

@sessions/CLAUDE.sessions.md

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

# CI Error Guidelines

If the user wants help with fixing an error in their CI pipeline, use the following flow:

- Retrieve the list of current CI Pipeline Executions (CIPEs) using the `nx_cloud_cipe_details` tool
- If there are any errors, use the `nx_cloud_fix_cipe_failure` tool to retrieve the logs for a specific task
- Use the task logs to see what's wrong and help the user fix their problem. Use the appropriate tools if necessary
- Make sure that the problem is fixed by running the task that you passed into the `nx_cloud_fix_cipe_failure` tool

<!-- nx configuration end-->
