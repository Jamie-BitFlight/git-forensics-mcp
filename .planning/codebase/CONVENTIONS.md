# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**
- Single lowercase file: `src/index.ts` - the main entry point
- Configuration files: kebab-case (e.g., `prettier.config.cjs`, `commitlint.config.cjs`)

**Functions:**
- camelCase for private methods: `getLastCommit()`, `handleBranchOverview()`, `analyzeConflicts()`
- camelCase for async handlers: `handleTimePeriodAnalysis()`, `handleFileChangesAnalysis()`
- Helper utilities: `findOverlappingChanges()`, `assessRiskLevel()`, `datesOverlap()`

**Classes:**
- PascalCase for main class: `GitAnalysisServer`
- Private property prefix: `private server: Server`

**Variables:**
- camelCase for local variables: `overview`, `analysis`, `timeRanges`
- camelCase for object properties: `repoPath`, `branches`, `outputPath`, `commitCount`
- All-lowercase with underscore for git format specifiers: `%H|%aI|%s` (part of git command strings)

**Types/Interfaces:**
- PascalCase for interfaces: `BranchOverviewArgs`, `TimePeriodArgs`, `FileChangesArgs`, `MergeRecommendationsArgs`
- Properties match snake_case to camelCase conversion: `repoPath` (not `repo_path`)

## Code Style

**Formatting:**
- Tool: Prettier 3.6.2
- Single quotes for strings: `'get_branch_overview'` not `"get_branch_overview"`
- Print width: 100 characters
- Trailing commas: ES5 style (no trailing comma in last object property)
- Example formatting from codebase:
  ```typescript
  const output = execSync(
    `cd "${repoPath}" && git log --format="%H|%aI|%s" ` +
      `--after="${timeRange.start}" --before="${timeRange.end}" ${branch}`,
    { encoding: 'utf8' }
  );
  ```

**Linting:**
- No ESLint configuration detected
- Pre-commit hook runs: commitlint → prettier → gitleaks (optional)
- Prettier runs on all staged `.{ts,js,json,md}` files before commit

## TypeScript Configuration

**Strict Mode:** All strict flags enabled in `tsconfig.json`
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `strictPropertyInitialization: true`
- `noImplicitThis: true`
- `alwaysStrict: true`
- `esModuleInterop: true`

**Compilation:**
- Target: ES2020
- Module: ES2020
- Output: `build/` directory
- Source maps enabled
- Declaration files generated

## Import Organization

**Order in `src/index.ts`:**
1. MCP SDK imports (from `@modelcontextprotocol/sdk/...`)
2. Node.js built-ins (`child_process`, `fs`, `path`)
3. Local interfaces/types (defined inline at top of file)

**Example from codebase:**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
```

**Path Aliases:**
- None used. Direct relative imports only.

## Error Handling

**Pattern: McpError with ErrorCode**
```typescript
if (!args?.repoPath || !args?.branches || !args?.outputPath) {
  throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
}
```

**Pattern: Try-catch with generic error response**
```typescript
try {
  switch (request.params.name) {
    // handler cases
  }
} catch (error) {
  return {
    content: [{
      type: 'text',
      text: `Git analysis error: ${error instanceof Error ? error.message : String(error)}`,
    }],
    isError: true,
  };
}
```

**Pattern: Command execution errors**
- Use `execSync` with `{ encoding: 'utf8' }` option
- No explicit error handling for git command failures (synchronous, throws on non-zero exit)
- Git command wrapped in backticks with `cd "${repoPath}" &&` prefix

**Pattern: Unknown tool handling**
```typescript
default:
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
```

## Logging

**Framework:** Console methods only

**Patterns:**
- `console.error()` for errors and MCP server lifecycle messages: `console.error('[MCP Error]', error)`
- `console.error('Git Analysis MCP server running on stdio')` for startup message
- No structured logging or log levels

## Comments

**When to Comment:**
- Function signatures: JSDoc-style comments describe purpose, input parameters, return values
- Complex logic blocks: Inline comments explain non-obvious algorithms (minimal in this codebase)
- Git command strings: No comments needed — commands are relatively self-documenting

**JSDoc/TSDoc:**
- Used sparingly — most functions have implicit types from TypeScript strict mode
- MCP tool descriptions embedded in schema: `description: 'Get high-level overview of branch states and relationships'`

## Function Design

**Size:** Functions average 15-30 lines
- Smaller utility functions: 3-10 lines (e.g., `datesOverlap()`, `assessRiskLevel()`)
- Handler functions: 10-20 lines (e.g., `handleBranchOverview()`)
- Complex analysis functions: 20-40 lines (e.g., `assessConflictRisks()`)

**Parameters:**
- Use typed interfaces for tool arguments: `BranchOverviewArgs`, `TimePeriodArgs`
- Pass entire object rather than destructuring individual parameters
- Type assertions when arguments come from untyped request: `const args = request.params.arguments as unknown as BranchOverviewArgs`

**Return Values:**
- Async handlers return MCP content envelope: `{ content: [{ type: 'text', text: '...' }] }`
- Error responses include `isError: true` flag
- Analysis functions return typed objects with `analysis`, `summary` properties

## Module Design

**Exports:**
- Single class instantiation at module bottom: `const server = new GitAnalysisServer(); server.run().catch(console.error);`
- No named exports (single-file implementation)
- MCP capabilities exposed via tool registration in `setupToolHandlers()`

**Barrel Files:**
- Not applicable — single-file codebase

## Interface Design

**Request/Response Pattern:**
All tool handlers follow:
1. Validate parameters (throw `McpError` if invalid)
2. Call private methods for analysis
3. Write JSON results to `outputPath` (not return in response)
4. Return success message with file path

**Example flow:**
```typescript
case 'get_branch_overview': {
  const args = request.params.arguments as unknown as BranchOverviewArgs;
  if (!args?.repoPath || !args?.branches || !args?.outputPath) {
    throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
  }
  return await this.handleBranchOverview(args);
}
```

## Private Methods Organization

**Git query methods** (return parsed data):
- `getLastCommit()` - Returns commit details
- `getCommitCount()` - Returns count as number
- `getCommitsInRange()` - Returns array of commits
- `getFileHistory()` - Returns file change history

**Analysis methods** (transform data):
- `summarizeActivity()` - Categorizes and counts commits
- `analyzeConflicts()` - Detects overlapping changes
- `determineMergeStrategy()` - Recommends merge approach
- `assessConflictRisks()` - Identifies hotspots

**Summary/Reporting methods** (aggregate results):
- `generateOverviewSummary()`
- `generateTimePeriodSummary()`
- `generateFileChangesSummary()`

## Conventional Commits

**Format:** `<type>(<scope>): <subject>`

**Types (from commitlint config):**
- `feat` - New feature (triggers minor version bump)
- `fix` - Bug fix (triggers patch version bump)
- `refactor` - Code refactoring (triggers patch version bump)
- `docs` - Documentation (triggers patch version bump)
- `perf` - Performance improvement (triggers patch version bump)
- `test` - Test-only changes (no version bump)
- `chore` - Dependency/tooling updates (no version bump)
- `ci` - CI configuration (no version bump)
- `build` - Build process (no version bump)

**Breaking Changes:**
- Suffix with `!` or use `BREAKING CHANGE:` footer in commit body (triggers major version bump)

**Pre-commit Enforcement:**
- `commitlint` validates format before commit (enforces @commitlint/config-conventional)
- `prettier` auto-formats all staged files
- `gitleaks` scans for secrets (optional, requires Docker)

---

*Convention analysis: 2026-02-07*
