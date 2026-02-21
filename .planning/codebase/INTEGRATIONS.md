# External Integrations

**Analysis Date:** 2026-02-07

## Overview

This is a standalone MCP (Model Context Protocol) server with no external API integrations, databases, or third-party service dependencies. All operations are local to the machine running the server.

## Git Operations

**Local Git Repository Analysis:**

- Method: Synchronous execution via Node.js `child_process.execSync()`
- Location: `src/index.ts` (GitAnalysisServer class)
- Operations:
  - Branch queries and comparisons
  - Commit history analysis
  - Merge conflict detection
  - Time-range-based activity analysis
  - File change tracking

**Git Commands Used:**

- `git branch` - List and inspect branches
- `git log` - Parse commit history
- `git show` - Analyze specific commits
- `git diff` - Compare branches and commits
- `git merge-base` - Find common ancestors

**Output Format:**

- Results written as JSON to file paths specified by caller (not returned via API)
- Location determined by `outputPath` parameter in tool arguments

## Data Storage

**Persistence:**

- Not applicable - server is stateless
- Analysis results written to caller-specified file paths (JSON format)
- No database, cache, or persistent state maintained

**File I/O:**

- Method: Node.js `fs.writeFileSync()`
- Used to write analysis JSON output to `outputPath` specified by MCP tool callers
- No other file storage integrations

## Communication

**MCP Protocol:**

- Transport: stdio (standard input/output)
- Format: JSON-RPC 2.0
- Connection: Non-persistent stdio streams
- Client: Any MCP-compatible client (e.g., Claude, other AI tools)
- Location: `src/index.ts` uses `StdioServerTransport` from `@modelcontextprotocol/sdk`

**Tool Interface:**

- Tool registration: `ListToolsRequestSchema` handler at `src/index.ts`
- Tool invocation: `CallToolRequestSchema` handler at `src/index.ts`
- Four tools exposed:
  - `get_branch_overview` - Branch state and relationships
  - `analyze_time_period` - Activity analysis by date range
  - `get_file_changes` - File modification tracking
  - `get_merge_recommendations` - Merge strategy suggestions

## Authentication & Identity

**Auth Provider:**

- Not applicable - local tool without authentication
- No user identity or access control
- Assumes local filesystem access for git repositories

**Release Publishing:**

- GitHub Actions uses `secrets.GH_RELEASE_TOKEN` for git operations
- GitHub Actions uses `secrets.NPM_TOKEN` for npm registry authentication
- Credentials: Not stored in codebase (managed as GitHub Secrets)

## Monitoring & Observability

**Error Tracking:**

- None - No external error tracking service

**Logging:**

- Method: Direct `console.error()` for MCP server errors
- Location: `src/index.ts` line 61: `this.server.onerror = (error) => console.error('[MCP Error]', error);`
- Scope: MCP protocol errors only
- No structured logging or external log aggregation

## CI/CD & Deployment

**Hosting:**

- npm registry (`https://registry.npmjs.org`) - Published as `@jamie-bitflight/git-forensics-mcp`
- GitHub repository (`https://github.com/Jamie-BitFlight/git-forensics-mcp.git`)

**CI Pipeline:**

- GitHub Actions (`.github/workflows/`)
- Runners: `ubuntu-latest` (Linux)
- Workflows:
  - `release.yml` - Version bump and tag on main push (uses Nx Release + conventional commits)
  - `publish.yml` - Publish to npm on GitHub release event
  - `claude.yml` - Claude Code integration (automated)
  - `claude-code-review.yml` - Code review integration (automated)

**Build Process:**

- Node.js 20 setup via `actions/setup-node@v4`
- pnpm 9 setup via `pnpm/action-setup@v4`
- TypeScript compilation: `pnpm build`
- Dependency caching: `cache: pnpm`

**Release Management:**

- Tool: Nx Release with conventional commits
- Versioning: Automatic semantic versioning
- Release creation: GitHub Releases (via `createRelease: "github"`)
- Changelog: Disabled (workspaceChangelog.file: false)
- Provenance: npm attestation enabled (`NPM_CONFIG_PROVENANCE: true`)

## Environment Configuration

**Build Environment:**

- Node.js version: 20.x
- pnpm version: 9.x
- Git: Required for analysis operations

**GitHub Secrets Required (for CI/CD):**

- `GH_RELEASE_TOKEN` - GitHub token for release operations (write permissions for contents, packages, issues, pull-requests)
- `NPM_TOKEN` - npm authentication token for package publishing (write-only)

**No .env File:**

- Application does not use environment variables for configuration
- All tool parameters passed via MCP request arguments
- No sensitive configuration stored in codebase

## Webhooks & Callbacks

**Incoming:**

- None - Server is not webhook-capable
- Operates in request-response mode only via MCP protocol

**Outgoing:**

- None - Server does not make outbound API calls or trigger webhooks

## Version Control Integration

**Pre-commit Hooks (`.husky/pre-commit`):**

1. commitlint - Validates conventional commit format
2. prettier - Auto-formats staged files (`.ts`, `.js`, `.json`, `.md`)
3. gitleaks - Scans for secrets (Docker-based, skips gracefully if unavailable)

**No External VCS Integrations:**

- GitHub Actions used for CI/CD (native GitHub integration)
- No Slack, Discord, or other notification integrations

---

_Integration audit: 2026-02-07_
