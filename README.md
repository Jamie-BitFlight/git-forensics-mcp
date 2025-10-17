# Git Forensics MCP

[![npm version](https://badge.fury.io/js/@jamie-bitflight%2Fgit-forensics-mcp.svg)](https://www.npmjs.com/package/@jamie-bitflight/git-forensics-mcp)

A Model Context Protocol (MCP) server for deep git repository investigation and analysis. This tool provides detailed insights into repository history, branch relationships, and development patterns to help teams make informed merge decisions and understand code evolution.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Requirements](#requirements)
- [Contributing](#contributing)
  - [Development Setup](#development-setup)
  - [Development Commands](#development-commands)
  - [Release Process](#release-process)
  - [Testing Published Releases](#testing-published-releases)
  - [Project Structure](#project-structure)
  - [Architecture Notes](#architecture-notes)
- [License](#license)

## Quick Start

Run the MCP server directly without installation:

```bash
npx @jamie-bitflight/git-forensics-mcp
```

Or add to Claude Code with a single command:

```bash
claude mcp add --scope user git-forensics -- npx -y @jamie-bitflight/git-forensics-mcp
```

No authentication or configuration required - the package is publicly available on npm.

## Features

Git Forensics MCP provides four powerful analysis tools to understand repository history and guide merge decisions:

### 1. Branch Overview (`get_branch_overview`)

Get a high-level snapshot of branch states and relationships to understand your repository's current structure.

**What it provides:**

- Last commit details for each branch (hash, date, message)
- Total commit counts per branch
- Merge base identification between branches
- Statistical summaries of branch activities

**Use cases:**

- Quickly assess branch divergence before merging
- Identify stale branches that may need rebasing
- Understand relative activity levels across branches

### 2. Time Period Analysis (`analyze_time_period`)

Dive deep into development activity within specific time periods to understand what changed and when.

**What it provides:**

- Detailed commit history for specified date ranges
- Automatic commit categorization (feature, fix, refactor, docs, other)
- Activity summaries showing commit patterns and trends
- Breakdown of work types across time periods

**Use cases:**

- Review sprint/milestone activities
- Analyze development velocity over time
- Understand what types of work dominated a release cycle

### 3. File Changes Analysis (`analyze_file_changes`)

Track how specific files evolved across branches to identify conflict risks and coordinate reviews.

**What it provides:**

- Complete modification history for tracked files
- Conflict detection when multiple branches modified the same files
- Risk assessment levels (low/medium/high) based on overlap patterns
- Recommended review order prioritized by risk level

**Use cases:**

- Identify potential merge conflicts before they happen
- Coordinate reviews when multiple teams touched the same code
- Plan merge order to minimize conflict resolution work

### 4. Merge Recommendations (`get_merge_recommendations`)

Get strategic guidance for merging branches based on comprehensive repository analysis.

**What it provides:**

- Optimal merge strategy recommendations
- Conflict risk assessment across all branches
- Code hotspot identification (files changed in multiple branches)
- Step-by-step merge guidance with risk mitigation

**Use cases:**

- Plan complex multi-branch merges
- Understand which branches to merge first
- Identify high-risk areas requiring extra review attention

## Installation

### Option 1: Run Directly (No Installation)

Use npx to run the latest version without installing:

```bash
npx @jamie-bitflight/git-forensics-mcp
```

### Option 2: Add to Claude Code (Recommended)

Use the Claude Code CLI to add as an MCP server:

```bash
claude mcp add --scope user git-forensics -- npx -y @jamie-bitflight/git-forensics-mcp
```

### Option 3: Manual Configuration

Add to your MCP configuration file (`~/.claude.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "git-forensics": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@jamie-bitflight/git-forensics-mcp"]
    }
  }
}
```

After adding the server, restart Claude Code or Claude Desktop to load the tools.

## Usage

The server integrates with any MCP-compatible client. All analysis results are written to JSON files for easy consumption and sharing.

### Example: Analyzing Branch Relationships

**Scenario:** You're preparing to merge a feature branch and want to understand divergence from main.

**Tool:** `get_branch_overview`

**Input:**

```json
{
  "repoPath": "/home/user/my-project",
  "branches": ["main", "feature/user-auth"],
  "outputPath": "/tmp/branch-analysis.json"
}
```

**Result:** JSON file containing:

- Last commits on both branches
- Number of commits on each since divergence
- Merge base commit details
- Summary statistics

### Example: Finding Potential Conflicts

**Scenario:** Multiple developers modified authentication code. You need to identify conflict risks.

**Tool:** `analyze_file_changes`

**Input:**

```json
{
  "repoPath": "/home/user/my-project",
  "branches": ["feature/oauth2", "feature/jwt-auth"],
  "files": ["src/auth/login.ts", "src/auth/session.ts"],
  "outputPath": "/tmp/conflict-analysis.json"
}
```

**Result:** JSON file containing:

- Change history for each file across branches
- Identified overlapping time periods (potential conflicts)
- Risk levels (high: both branches touched same files)
- Recommended review order

### Example: Sprint Activity Review

**Scenario:** Review all development activity during last sprint (Jan 1-15).

**Tool:** `analyze_time_period`

**Input:**

```json
{
  "repoPath": "/home/user/my-project",
  "branches": ["main", "develop"],
  "timeRange": {
    "start": "2025-01-01",
    "end": "2025-01-15"
  },
  "outputPath": "/tmp/sprint-analysis.json"
}
```

**Result:** JSON file containing:

- All commits in date range categorized by type
- Summary showing breakdown (e.g., 15 features, 8 fixes, 3 refactors)
- Activity timeline

### Input Parameters Reference

All tools accept common parameters:

- **`repoPath`** (required): Absolute path to the git repository
- **`branches`** (required): Array of branch names to analyze (e.g., `["main", "develop"]`)
- **`outputPath`** (required): Where to write the analysis JSON file

Tool-specific parameters:

- **`timeRange`** (for `analyze_time_period`): Object with `start` and `end` dates (ISO 8601 format)
- **`files`** (for `analyze_file_changes`): Array of file paths relative to repository root

### Output Format

All tools generate JSON files with consistent structure:

```json
{
  "analysis": [
    /* Tool-specific detailed results */
  ],
  "summary": {
    /* Statistical summaries */
    /* Risk assessments (where applicable) */
    /* Recommendations based on analysis */
  }
}
```

> [!note]
> Output files can be large for repositories with extensive history. Consider using specific time ranges or file filters to focus analysis.

## Requirements

### For Users

- **Node.js 20+** - Required to run the MCP server
- **Git** - Must be installed and accessible via PATH
- **MCP-compatible client** - Such as Cursor, Gemini, Codex, Claude Code or Claude Desktop

### For Development

- **Node.js 20+** - As specified in GitHub Actions workflows
- **pnpm 9+** - Package manager ([installation guide](https://pnpm.io/installation))

## Contributing

Contributions are welcome! Whether you're fixing bugs, adding features, or improving documentation, we appreciate your help.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/git-forensics-mcp.git
cd git-forensics-mcp

# Install dependencies (use pnpm, not npm)
pnpm install

# Build the project
pnpm build

# Test by listing available tools
pnpm tools:list
```

### Development Commands

All development tasks are managed through pnpm scripts:

```bash
# Build the TypeScript source code
pnpm build

# Start the MCP server (waits for JSON-RPC input on stdin)
# Note: Running this directly will hang waiting for input. Use with piped JSON:
# echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | pnpm start
pnpm start

# List available MCP tools from the running server
pnpm tools:list

# Format code with Prettier
pnpm format

# Check code formatting without making changes
pnpm format:check

# Run pre-commit hooks manually
pnpm precommit

# Test the release process in dry-run mode (preview without publishing)
pnpm nx release --dry-run

# Perform a full release (version bump, changelog, git tag) without publishing
pnpm nx release --skip-publish
```

**Development Tools:**

- **Prettier** - Code formatting (configuration in `.prettierrc`)
- **Husky** - Pre-commit hooks that run formatting and validation automatically
- **Nx Release** - Automated versioning and publishing with conventional commits
- **TypeScript strict mode** - Type safety across all source files

### Release Process

This project uses automated semantic versioning via Nx Release with conventional commits.

#### How It Works

1. **Commit with conventional format** - Use structured commit messages (see below)
2. **Merge to main** - GitHub Actions automatically:
   - Analyzes commits since last release
   - Calculates new version based on commit types
   - Updates `package.json` and `CHANGELOG.md`
   - Creates version bump commit and git tag
   - Publishes to npmjs.org

#### Conventional Commit Format

```text
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

- `test`: Test changes (no version bump)
- `chore`: Maintenance tasks (no version bump)
- `ci`: CI/CD changes (no version bump)
- `build`: Build system changes (no version bump)

**Breaking changes:** Add `!` after type (e.g., `feat!:`) or include `BREAKING CHANGE:` in footer for major version bump (0.1.0 → 1.0.0)

**Examples:**

```bash
feat: add branch divergence analysis
fix: correct merge base calculation
feat!: change output format to JSON-LD
docs: update installation instructions
```

> [!important]
> Follow the conventional commit format for all contributions. This ensures proper automated versioning and changelog generation.

#### CHANGELOG and Versioning

- `CHANGELOG.md` is automatically generated by Nx Release and should **not be edited manually**
- `CHANGELOG.md` is included in `.gitignore` as it's regenerated during the release process
- Version numbers are calculated automatically based on conventional commit types

### Testing Published Releases

You can validate any published version using the MCP Inspector in CLI mode:

#### Step 1: List available tools from published package

```bash
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION --method tools/list
```

Expected output: JSON showing 4 tools with schemas:

- `get_branch_overview`
- `analyze_time_period`
- `analyze_file_changes`
- `get_merge_recommendations`

#### Step 2: Test a tool invocation

```bash
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION \
  --method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=/path/to/repo \
  --tool-arg 'branches=["main","feature"]' \
  --tool-arg outputPath=/tmp/test.json
```

Expected output: Success message indicating analysis written to file

#### Step 3: Verify output file contains valid analysis

```bash
cat /tmp/test.json
```

Expected output: Valid JSON with overview array and summary statistics

#### Validation Checklist

- Package installs via npx from npmjs.org
- MCP server responds to protocol requests
- All 4 tools listed with correct schemas
- Tool execution succeeds and generates output
- Output file contains valid repository analysis JSON

### Project Structure

```text
git-forensics-mcp/
├── src/
│   └── index.ts          # Single-file MCP server implementation
├── build/                # Compiled output (gitignored)
├── package.json          # Package configuration and scripts
├── tsconfig.json         # TypeScript configuration (strict mode)
└── README.md             # This file
```

The codebase is intentionally minimal:

- Single TypeScript file (`src/index.ts`) containing the entire MCP server
- Uses `@modelcontextprotocol/sdk` for MCP implementation
- TypeScript with strict mode enabled for type safety

### Architecture Notes

The server is implemented as a single `GitAnalysisServer` class that:

- Registers four MCP tools with defined input schemas
- Executes git commands synchronously via `execSync`
- Writes JSON analysis results to specified file paths
- Runs on stdio transport for MCP communication

**Key design decisions:**

- **Synchronous execution** - Uses `execSync` for simplicity (git operations are typically fast)
- **File-based output** - Writes JSON files to handle large analysis results without overwhelming MCP protocol
- **Monolithic structure** - Single file/class for simplicity and ease of understanding
- **No caching** - Each invocation runs fresh git commands to ensure up-to-date analysis
- **Strict TypeScript** - All strict mode flags enabled for maximum type safety

## License

This project is licensed under the **Apache License, Version 2.0** - see the [LICENSE.txt](LICENSE.txt) file for complete details.

**What this means for you:**

The Apache License 2.0 is a permissive open-source license that allows you to:

- **Use commercially** - Integrate into commercial products and services
- **Modify freely** - Adapt the code to your specific needs
- **Distribute** - Share the original or modified versions
- **Create derivative works** - Build new projects based on this code
- **Include in other projects** - Combine with code under different licenses

**Requirements:**

- Include the original license and copyright notice when distributing
- State significant changes made to the code
- Include a NOTICE file if one exists

**Protections:**

- Provides an express grant of patent rights from contributors
- Protects contributors from liability

**Contributing:**

All contributions will be licensed under the Apache License 2.0. By submitting a pull request, you agree to license your contribution under the same terms.

---

Copyright 2025. Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0); you may not use this project except in compliance with the License.
