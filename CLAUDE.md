# CLAUDE.md

This file provides instructions for Claude Code when working in this repository.

## Project Overview

Git Forensics MCP is a Model Context Protocol (MCP) server that provides deep git repository investigation and analysis. It's a specialized forensics tool focused on git repository analysis, not general GitHub or git operations.

The server provides four forensics analysis tools:

1. **Branch Overview** - High-level branch state and relationship analysis
2. **Time Period Analysis** - Detailed activity within specific timeframes
3. **File Changes Analysis** - Cross-branch file modification tracking with conflict detection
4. **Merge Recommendations** - Strategic merge planning with risk assessment

## Architecture

### Single-Class MCP Server Design

The entire server is implemented in `src/index.ts` as a single `GitAnalysisServer` class that:

- Registers four MCP tools with defined input schemas
- Handles tool invocation requests
- Executes git commands synchronously via `execSync`
- Writes JSON analysis results to specified file paths
- Runs on stdio transport for MCP communication

### Git Command Execution Pattern

All git operations follow this pattern:

1. Execute git command using `execSync` with `cd` to repoPath
2. Parse output into structured data
3. Return typed objects (not raw strings)

Example:

```typescript
private getLastCommit(repoPath: string, branch: string) {
  const output = execSync(
    `cd "${repoPath}" && git log -1 --format="%H|%aI|%s" ${branch}`,
    { encoding: 'utf8' }
  ).trim();
  const [hash, date, message] = output.split('|');
  return { hash, date, message, branch };
}
```

### Tool Handler Architecture

Each tool follows a consistent pattern:

1. **Validation** - Check for required parameters, throw `McpError` if missing
2. **Data Collection** - Call private git methods to gather raw data
3. **Analysis** - Process data through summary/analysis methods
4. **Output** - Write JSON to specified `outputPath`
5. **Response** - Return MCP success message

All tools write results to files rather than returning data directly - this is intentional for handling large analysis results.

### Analysis Methods

The server includes specialized analysis methods:

- **Commit Categorization** - Classify commits as feature/fix/refactor/docs/other based on message patterns
- **Conflict Detection** - Find overlapping time ranges where branches modified the same files
- **Risk Assessment** - Calculate risk levels (low/medium/high) based on overlap counts
- **Merge Strategy** - Recommend base branch and approach based on commit counts
- **Hotspot Detection** - Identify files changed in multiple branches

### Error Handling

- Parameter validation throws `McpError` with `ErrorCode.InvalidParams`
- Git command failures are caught and returned as error responses with `isError: true`
- All errors include descriptive messages for debugging

## Key Design Decisions

1. **Synchronous Execution** - Uses `execSync` rather than async for simplicity, as git operations are typically fast
2. **File-Based Output** - Writes JSON files instead of returning data directly to handle large analysis results
3. **Monolithic Structure** - Single file/class keeps the codebase simple and easy to understand
4. **No Caching** - Each tool invocation runs fresh git commands; no state is maintained between calls
5. **Strict TypeScript** - Configured with all strict mode flags for type safety

## Development Workflow

### Package Manager

ALWAYS use **pnpm** (not npm) for all package operations:

```bash
pnpm install          # Install dependencies
pnpm build            # Compile TypeScript
pnpm start            # Run MCP server via ts-node (development mode)
```

### Build and Test Commands

```bash
# Compile TypeScript to build/ directory
pnpm build

# Test by listing available tools (uses MCP Inspector CLI mode)
pnpm tools:list

# Or use inspector with custom method
pnpm inspect:method tools/list
```

**Note:** This is an MCP server that runs on stdio transport. It cannot be executed directly like `./build/index.js` - it must be invoked through an MCP client or the MCP Inspector.

Available npm scripts from package.json:

- `pnpm build` - Compile TypeScript and make build/index.js executable
- `pnpm start` - Starts the MCP server, which waits for newline-delimited JSON-RPC 2.0 messages on stdin. Used by MCP clients (configured in `~/.claude.json`), by the inspector scripts (`tools:list`, `inspect:method`), and for manual protocol testing during development by piping JSON-RPC messages directly to stdin. Use `jq` to construct test messages with dynamic parameters.
- `pnpm tools:list` - Test by listing tools via inspector
- `pnpm inspect:method <method>` - Run inspector with specific method
- `pnpm prepare` - Runs husky (git hooks setup, executed automatically after install)
- `pnpm prettier` - Run prettier directly
- `pnpm format` - Format all TypeScript, JavaScript, JSON, and Markdown files
- `pnpm format:check` - Check formatting without modifying files

No test runner or linter is currently configured in this project.

## Release and Publishing Workflow

### Two-Stage Automated Pipeline

This project uses **Nx Release** with **conventional commits** for automated versioning and publishing to **npmjs.org**.

#### Stage 1: Version Bump and Tagging (release.yml)

Triggered on push to main branch:

1. Analyzes commits since last release using conventional commit format
2. Calculates semantic version (major/minor/patch) based on commit types
3. Updates `package.json` with new version
4. Generates/updates `CHANGELOG.md`
5. Creates version bump commit: `chore(release): X.Y.Z [skip ci]`
6. Creates and pushes git tag (e.g., `v0.2.0`)
7. Uses `GH_RELEASE_TOKEN` for authentication (needed to trigger next workflow)

#### Stage 2: Package Publishing (publish.yml)

Triggered when new tag is pushed:

1. Checks out code at the tagged version
2. Builds the package
3. Publishes to **npmjs.org** using `NPM_TOKEN` secret
4. Creates GitHub Release with changelog

### Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types that trigger releases:**

- `feat`: New feature → minor version bump (0.1.0 → 0.2.0)
- `fix`: Bug fix → patch version bump (0.1.0 → 0.1.1)
- `perf`: Performance improvement → patch version bump
- `docs`: Documentation changes → patch version bump
- `refactor`: Code refactoring → patch version bump

**Types that don't trigger releases:**

- `test`: Test changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

**Breaking changes:** Add `!` after type (e.g., `feat!:`) or include `BREAKING CHANGE:` in footer → major version bump (0.1.0 → 1.0.0)

### GitHub MCP Tools for Workflow Management

Use `mcp__github__*` tools for PR and workflow management:

- `mcp__github__create_pull_request` - Create PRs after feature work
- `mcp__github__list_workflow_runs` - Check CI status
- `mcp__github__get_workflow_run` - Debug failed workflows (takes run_id parameter)
- `mcp__github__list_tags` - Verify published versions

### Testing Release Process Locally

```bash
# Run Nx release in dry-run mode to preview changes
pnpm nx release --dry-run

# Or run actual release (versions, creates commit and tag, but skips publish)
pnpm nx release --skip-publish

# Then push the changes manually
git push && git push --tags

# Publishing happens automatically via GitHub Actions when tag is pushed
```

## Validating Published Packages

After publishing, validate the package using MCP Inspector in **CLI mode** (NEVER use interactive mode):

### Why CLI Mode is Required

The MCP Inspector has two modes:

1. **Interactive UI mode** (default) - Opens a browser interface
2. **CLI mode** (`--cli` flag) - Non-interactive terminal output

**ALWAYS use CLI mode** because:

- Claude Code cannot interact with browser interfaces
- CI environments don't support interactive UIs
- CLI mode provides scriptable, parseable output
- Results can be captured and verified programmatically

### Validation Commands

```bash
# Step 1: List available tools from the published package
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION --method tools/list

# Expected: JSON showing 4 tools with schemas
# - get_branch_overview
# - analyze_time_period
# - analyze_file_changes
# - get_merge_recommendations

# Step 2: Test tool invocation
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION \
  --method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=/path/to/repo \
  --tool-arg 'branches=["main","feature-branch"]' \
  --tool-arg outputPath=/tmp/test-output.json

# Expected: Success message indicating file was written

# Step 3: Verify output file contains valid analysis
cat /tmp/test-output.json

# Expected: Valid JSON with overview array and summary object
```

**Validation Checklist:**

- Package installs via npx from npmjs.org
- MCP server responds to protocol requests
- All 4 tools listed with correct schemas
- Tool execution succeeds and generates output
- Output file contains valid repository analysis JSON

## Common Development Tasks

### Adding a New Analysis Tool

1. Define the input arguments interface (extends base parameters: `repoPath`, `branches`, `outputPath`)
2. Add tool definition to `ListToolsRequestSchema` handler with schema
3. Add case to `CallToolRequestSchema` handler
4. Implement handler method following the pattern:
   - Collect data via git methods
   - Process/analyze data
   - Generate summary
   - Write JSON output
   - Return success message
5. Add any new git operation methods needed

### Modifying Git Command Execution

All git commands must:

- Use `cd "${repoPath}"` to work in the target repository
- Specify encoding as 'utf8' for text output
- Parse output into structured objects, not raw strings
- Handle potential empty results (filter(Boolean))

### Testing the Server

This is an MCP server that runs on stdio transport - it cannot be executed directly. Test using one of these methods:

**Method 1: Quick validation using pnpm scripts**

```bash
# List available tools (uses MCP Inspector CLI mode)
pnpm tools:list

# Use inspector with custom method
pnpm inspect:method tools/call --tool-name get_branch_overview --tool-arg repoPath=$(pwd) --tool-arg 'branches=["main"]' --tool-arg outputPath=/tmp/test.json
```

**Method 2: MCP Inspector CLI mode (for published packages)**

```bash
# List tools from published package
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp --method tools/list

# Test a tool invocation
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp \
  --method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=/path/to/repo \
  --tool-arg 'branches=["main"]' \
  --tool-arg outputPath=/tmp/test.json
```

**Method 3: Configure in MCP Client**

1. Build using `pnpm build`
2. Add to Claude Code/Desktop configuration (see README.md Installation section)
3. Invoke tools through the MCP client
4. Verify JSON output files contain expected analysis

Tool invocation requires:

- Valid git repository path
- Array of branch names that exist in the repo
- Output path where JSON can be written
- Tool-specific parameters (time ranges, file paths)

## Additional Guidance

@sessions/CLAUDE.sessions.md

This file provides instructions for Claude Code for working in the cc-sessions framework.

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
