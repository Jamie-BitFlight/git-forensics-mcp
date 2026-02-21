# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**

- TypeScript files use lowercase with extension: `index.ts`
- Single file architecture: `src/index.ts`

**Functions:**

- camelCase for all functions and methods
- Examples: `getLastCommit`, `getCommitCount`, `handleBranchOverview`, `categorizeCommits`, `analyzeConflicts`, `findOverlappingChanges`, `assessRiskLevel`
- Private methods prefixed with `private` keyword
- Handler methods use `handle` prefix: `handleBranchOverview`, `handleTimePeriodAnalysis`, `handleFileChangesAnalysis`, `handleMergeRecommendations`
- Getter/helper methods use action verbs: `get*`, `generate*`, `analyze*`, `summarize*`, `assess*`, `determine*`, `find*`

**Classes:**

- PascalCase for class names
- Example: `GitAnalysisServer`
- Single class per file containing all server logic

**Interfaces:**

- PascalCase for interface names
- Suffix with `Args` for argument/parameter interfaces
- Examples: `BranchOverviewArgs`, `TimePeriodArgs`, `FileChangesArgs`, `MergeRecommendationsArgs`
- Used for type-safe parameter validation

**Variables:**

- camelCase for all variables
- `const` for immutable declarations (primary pattern)
- `let` avoided in favor of `const` unless reassignment needed
- Example: `overview`, `analysis`, `commitCounts`, `changedFiles`, `hotspots`

**Types:**

- Inline type definitions via `typeof` operator (seen with `unknown as unknown as BranchOverviewArgs`)
- Discriminated unions for type narrowing

## Code Style

**Formatting:**

- Tool: Prettier with config in `prettier.config.cjs`
- Single quotes for strings
- 100 character line width
- Trailing commas in ES5 style (arrays, objects)
- Auto-formatted on pre-commit hook

**Linting:**

- No ESLint/linter configured currently
- TypeScript strict mode enforces type safety

## Import Organization

**Order:**

1. External dependencies from `@modelcontextprotocol/sdk`
2. Native Node modules (`child_process`, `fs`, `path`)
3. Type imports and interfaces (defined in-file)

**Path Aliases:**

- Not used; relative imports via SDK package paths with `.js` extensions (ESM)
- Pattern: `from '@modelcontextprotocol/sdk/server/index.js'`

## Error Handling

**Patterns:**

- Invalid parameters throw `McpError` with `ErrorCode.InvalidParams`
- Unknown tool names throw `McpError` with `ErrorCode.MethodNotFound`
- Catch-all in tool handler wraps errors in response object: `{content: [...], isError: true}`
- Error messages include context: `Git analysis error: ${error instanceof Error ? error.message : String(error)}`
- Git command failures caught and returned as error responses (not thrown)
- Graceful degradation: return `{isError: true}` for git execution errors

**Error Class Pattern:**

```typescript
// In tool request handler (src/index.ts lines 179-224)
try {
  switch (request.params.name) {
    case 'get_branch_overview': {
      const args = request.params.arguments as unknown as BranchOverviewArgs;
      if (!args?.repoPath || !args?.branches || !args?.outputPath) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
      }
      return await this.handleBranchOverview(args);
    }
    // ... other cases
  }
} catch (error) {
  return {
    content: [
      {
        type: 'text',
        text: `Git analysis error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}
```

## Logging

**Framework:** `console` (console.error for errors)

**Patterns:**

- Server startup status: `console.error('Git Analysis MCP server running on stdio')` (line 622)
- Error logging: `console.error('[MCP Error]', error)` (line 61)
- Prefix errors with context: `[MCP Error]` or `Git analysis error:`
- No structured logging framework used

## Comments

**When to Comment:**

- Minimal inline comments; code is self-documenting via clear naming
- Comments used only when intent is non-obvious
- No JSDoc/TSDoc annotations present

**JSDoc/TSDoc:**

- Not used in this codebase
- Type information conveyed via TypeScript interfaces and type annotations

## Function Design

**Size:**

- Ranges from 1-20 lines typically
- Average ~5-15 lines for most private methods
- Handler methods typically 10-15 lines
- Focused on single responsibility

**Parameters:**

- Typed via interfaces for complex argument sets
- Example: `handleBranchOverview(args: BranchOverviewArgs)` unpacks as needed
- Single object parameter for multiple related values
- Avoid excessive parameters

**Return Values:**

- Typed return statements with union types when appropriate
- Examples:
  - `getCommitCount(): number` — single scalar (line 351)
  - `getLastCommit()` — returns typed object (line 343-349)
  - Handler methods return MCP response objects: `{content: [{type, text}]}`
  - Maps return arrays of typed objects: `Array<{branch: string, count: number}>`

## Module Design

**Exports:**

- Single class export: `GitAnalysisServer` (defined line 43)
- Instantiation and run at module level: `const server = new GitAnalysisServer(); server.run()` (lines 626-627)
- Interfaces exported implicitly via internal use

**Barrel Files:**

- Not applicable; single-file architecture
- No index.ts re-exports

**File Organization:**

- Interfaces at top of file (lines 14-41)
- Class definition follows (lines 43-627)
- Setup and execution at bottom (lines 626-627)
- Method organization within class:
  1. Constructor (lines 46-66)
  2. Setup method `setupToolHandlers` (lines 68-224)
  3. Handler methods for each tool (lines 227-341)
  4. Git command execution methods (lines 343-399)
  5. Analysis/summarization methods (lines 401-604)
  6. Utility methods for categorization and assessment (lines 401-617)

**Private vs Public:**

- All methods explicitly marked `private`
- Only constructor and `run()` method implicitly public (lines 619-623)
- Encapsulation enforced via access modifiers

---

_Convention analysis: 2026-02-07_
