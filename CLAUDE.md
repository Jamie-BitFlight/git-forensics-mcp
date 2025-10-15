# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git Forensics MCP is a Model Context Protocol (MCP) server that provides deep git repository investigation and analysis. It's a specialized forensics tool focused solely on git repository analysis, not general GitHub or git operations.

The server provides four forensics analysis tools:
1. **Branch Overview** - High-level branch state and relationship analysis
2. **Time Period Analysis** - Detailed activity within specific timeframes
3. **File Changes Analysis** - Cross-branch file modification tracking with conflict detection
4. **Merge Recommendations** - Strategic merge planning with risk assessment

## Development Commands

### Build and Run
```bash
# Compile TypeScript to build/ directory
npm run build

# Run the compiled MCP server
npm start

# The build output is executable directly (has shebang)
./build/index.js
```

### Installation
```bash
# Install dependencies with pnpm (faster than npm)
pnpm install
```

Note: No test runner or linter is currently configured in this project.

## Versioning and Publishing

This project uses **Nx Release** with **conventional commits** for automated versioning and publishing to GitHub Packages.

### How It Works

1. **Commit with conventional format** - Use conventional commit messages:
   - `feat: add new tool` → minor version bump (0.1.0 → 0.2.0)
   - `fix: correct parsing bug` → patch version bump (0.1.0 → 0.1.1)
   - `feat!: breaking change` → major version bump (0.1.0 → 1.0.0)

2. **Merge to main** - When PR merges to main, GitHub Actions automatically:
   - Analyzes commits since last release
   - Calculates new version based on commit types
   - Updates `package.json` with new version
   - Generates/updates `CHANGELOG.md`
   - Commits version bump with `chore(release): X.Y.Z [skip ci]`
   - Creates git tag (e.g., `v0.2.0`)
   - Pushes commit and tag to main

3. **Tag triggers publish** - When tag is pushed, a separate workflow:
   - Builds the package from the tagged commit
   - Publishes to GitHub Packages
   - Creates GitHub Release with changelog

### Conventional Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature (minor bump)
- `fix`: Bug fix (patch bump)
- `perf`: Performance improvement (patch bump)
- `docs`: Documentation changes (patch bump)
- `refactor`: Code refactoring (patch bump)
- `test`: Test changes (no release)
- `chore`: Maintenance tasks (no release)
- `ci`: CI/CD changes (no release)
- `build`: Build system changes (no release)

**Breaking changes:** Add `!` after type or `BREAKING CHANGE:` in footer for major version bump.

### Authentication Configuration

The repository includes a `.npmrc` file that handles GitHub Packages authentication:

```ini
@jamie-bitflight:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

This file:
- **Is committed to the repository** (contains no secrets, uses environment variable substitution)
- **Uses `${GITHUB_TOKEN}` variable** - works locally (from ~/.bashrc) and in CI (from GitHub secrets)
- **Eliminates manual configuration** - no need to run `echo` commands to set up .npmrc

### Testing the Release Workflow

Releases are automatic on push to main. To test the release process locally:

```bash
# Ensure GITHUB_TOKEN is set (should already be in ~/.bashrc)
echo $GITHUB_TOKEN

# Run Nx release in dry-run mode to see what would happen
pnpm nx release --dry-run

# Or run actual release (versions, creates commit and tag, but skips publish)
pnpm nx release --skip-publish

# Then push the changes
git push && git push --tags

# Publishing happens automatically via GitHub Actions when tag is pushed
```

**Note:** The `.npmrc` file automatically provides authentication for both local testing and CI workflows.

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

## Testing the Server

Since this is an MCP server, test it by:
1. Building: `npm run build`
2. Configuring it in an MCP client (like Claude Desktop)
3. Invoking tools with test repositories
4. Verifying JSON output files contain expected analysis

Example tool invocation requires:
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