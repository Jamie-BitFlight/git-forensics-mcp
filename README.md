# Git Forensics MCP

A Model Context Protocol (MCP) server for deep git repository investigation and analysis. This tool provides detailed insights into repository history, branch relationships, and development patterns.

## Features

The server provides four main analysis tools:

1. **Branch Overview** (`get_branch_overview`)
   - High-level overview of branch states and relationships
   - Last commits, commit counts, and merge bases
   - Statistical summaries of branch activities

2. **Time Period Analysis** (`analyze_time_period`)
   - Detailed development activity in specific time periods
   - Commit categorization (feature, fix, refactor, docs, other)
   - Activity summaries with commit patterns

3. **File Changes Analysis** (`analyze_file_changes`)
   - Track changes to specific files across branches
   - Identify potential conflict areas
   - Risk assessment for file modifications
   - Recommended review order based on risk levels

4. **Merge Recommendations** (`get_merge_recommendations`)
   - Optimal merge strategies
   - Conflict risk assessment
   - Code hotspot identification
   - Step-by-step merge guidance

## Installation

This package is published to npmjs.org and can be run directly with npx:

```bash
# Run directly without installation
npx @jamie-bitflight/git-forensics-mcp

# Or add to Claude Code as an MCP server
claude mcp add --scope user git-forensics -- npx -y @jamie-bitflight/git-forensics-mcp
```

No authentication or configuration is required - the package is publicly available on npm.

### Adding to Claude Code or Claude Desktop

Add to your MCP configuration file (`~/.claude.json`):

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

Or use the Claude Code CLI:

```bash
claude mcp add --scope user git-forensics -- npx -y @jamie-bitflight/git-forensics-mcp
```

## Usage

The server runs as an MCP service and integrates with any MCP-compatible client. All analysis results are written to specified output files in JSON format.

### Input Parameters

Each tool accepts:

- `repoPath`: Path to the git repository
- `branches`: Array of branch names to analyze
- `outputPath`: Path where analysis results will be written
- Additional tool-specific parameters:
  - `timeRange`: Start and end dates for period analysis
  - `files`: Array of file paths for file change analysis

### Output Format

All tools output JSON files containing:

- Detailed analysis results
- Summary statistics
- Risk assessments (where applicable)
- Recommendations based on analysis

## Requirements

- **Node.js 20+** (as specified in GitHub Actions workflows)
- **pnpm 9+** (see [installation guide](https://pnpm.io/installation))
- **Git** (must be installed and accessible via PATH)

### For Development

- TypeScript 5.0+
- ts-node 10.9+ (for running TypeScript directly during development)

## Release Process

This project uses automated semantic versioning via Nx Release with conventional commits:

### How It Works

1. **Commit with conventional format** - Use structured commit messages
2. **Merge to main** - GitHub Actions automatically:
   - Analyzes commits since last release
   - Calculates new version based on commit types
   - Updates `package.json` and `CHANGELOG.md`
   - Creates version bump commit and git tag
   - Publishes to npmjs.org

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

## Testing Published Releases

You can validate any published version using the MCP Inspector in CLI mode:

```bash
# Step 1: List available tools from published package
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION --method tools/list

# Expected output: JSON showing 4 tools with schemas:
# - get_branch_overview
# - analyze_time_period
# - analyze_file_changes
# - get_merge_recommendations
```

```bash
# Step 2: Test a tool invocation
npx @modelcontextprotocol/inspector --cli npx @jamie-bitflight/git-forensics-mcp@VERSION \
  --method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=/path/to/repo \
  --tool-arg 'branches=["main","feature"]' \
  --tool-arg outputPath=/tmp/test.json

# Expected output: Success message indicating analysis written to file
```

```bash
# Step 3: Verify output file contains valid analysis
cat /tmp/test.json

# Expected output: Valid JSON with overview array and summary statistics
```

**Validation Checklist:**

- Package installs via npx from npmjs.org
- MCP server responds to protocol requests
- All 4 tools listed with correct schemas
- Tool execution succeeds and generates output
- Output file contains valid repository analysis JSON

## Contributing

Contributions are welcome! If you'd like to contribute to this project:

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

### Commit Guidelines

Follow the conventional commit format described in the [Release Process](#release-process) section. Your commits should use types like `feat:`, `fix:`, `docs:`, etc.

### Project Structure

- `src/index.ts` - Single-file MCP server implementation
- `build/` - Compiled output (gitignored)
- TypeScript with strict mode enabled
- Uses `@modelcontextprotocol/sdk` for MCP implementation

### Architecture Notes

The server is implemented as a single `GitAnalysisServer` class that:

- Registers four MCP tools with defined input schemas
- Executes git commands synchronously via `execSync`
- Writes JSON analysis results to specified file paths
- Runs on stdio transport for MCP communication

Key design decisions:

- **Synchronous execution** - Uses `execSync` for simplicity (git operations are fast)
- **File-based output** - Writes JSON files to handle large analysis results
- **Monolithic structure** - Single file/class for simplicity
- **No caching** - Each invocation runs fresh git commands

### License

All contributions will be under the Apache License 2.0. This permissive license allows you to:

- Use the code commercially
- Modify and distribute the code
- Create derivative works
- Include in other projects

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE.txt](LICENSE.txt) file for details.

Copyright 2025. Licensed under the Apache License, Version 2.0; you may not use this project except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
