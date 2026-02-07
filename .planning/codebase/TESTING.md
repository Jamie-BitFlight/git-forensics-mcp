# Testing Patterns

**Analysis Date:** 2026-02-07

## Current Testing Status

**Test Framework:** Not configured

**No test runner detected:**
- `jest.config.js` - Not present
- `vitest.config.js` - Not present
- Test dependencies - Not in `package.json`

**No test files found:**
- No `.test.ts` files
- No `.spec.ts` files
- No `__tests__` directories

## Manual Testing Approach

**MCP Inspector CLI Mode:**

The codebase is designed as a stdio MCP server that cannot run directly. Testing uses MCP Inspector CLI:

```bash
pnpm tools:list                           # List available tools via inspector
pnpm inspect:method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=$(pwd) \
  --tool-arg 'branches=["main"]' \
  --tool-arg outputPath=/tmp/test.json   # Test specific tool with arguments
```

**How it works:**
- MCP Inspector launches the server via `pnpm start`
- Sends JSON-RPC requests to stdio
- Tool handler executes and writes JSON results to specified `outputPath`
- Inspector displays response in CLI

## Code Organization for Testing

**Single-File Structure:**
- All code in `src/index.ts` (~627 lines)
- `GitAnalysisServer` class with:
  - Public methods: `constructor()`, `run()` (async)
  - Private methods: 30+ analysis and query functions

**Entry Point:**
- `src/index.ts` - Main server implementation
- Server instantiation and startup at end of file:
  ```typescript
  const server = new GitAnalysisServer();
  server.run().catch(console.error);
  ```

## Method-Level Testability

**Testable Private Methods (if unit tests were added):**

**Git Query Methods:**
```typescript
private getLastCommit(repoPath: string, branch: string)
private getCommitCount(repoPath: string, branch: string): number
private getMergeBase(repoPath: string, branch1: string, branch2: string): string
private getCommitsInRange(repoPath, branch, timeRange)
private getFileHistory(repoPath: string, branch: string, file: string)
```

**Analysis Methods:**
```typescript
private summarizeActivity(commits)
private categorizeCommits(commits)
private analyzeConflicts(branchChanges)
private findOverlappingChanges(branchChanges)
private datesOverlap(start1, end1, start2, end2): boolean
private assessRiskLevel(overlaps)
private generateConflictReasons(overlaps)
```

**Strategy Methods:**
```typescript
private determineMergeStrategy(repoPath, branches)
private assessConflictRisks(repoPath, branches)
private generateMergeSteps(repoPath, branches)
```

**Summary Methods:**
```typescript
private generateOverviewSummary(overview)
private generateTimePeriodSummary(analysis)
private generateFileChangesSummary(analysis)
```

## Error Handling in Handlers

**Pattern: Parameter Validation**
```typescript
if (!args?.repoPath || !args?.branches || !args?.outputPath) {
  throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
}
```

**Pattern: Try-Catch Wrapper**
```typescript
try {
  switch (request.params.name) {
    case 'get_branch_overview': {
      const args = request.params.arguments as unknown as BranchOverviewArgs;
      // validation
      return await this.handleBranchOverview(args);
    }
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }
} catch (error) {
  return {
    content: [{ type: 'text', text: `Git analysis error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
```

## Data Transformation Pipeline (for integration testing)

**Branch Overview Flow:**
1. Input: `branches: string[]`
2. For each branch: call `getLastCommit()`, `getCommitCount()`, `getMergeBase()`
3. Transform: build overview objects
4. Summarize: `generateOverviewSummary()`
5. Output: write JSON to `outputPath`

**Time Period Analysis Flow:**
1. Input: `branches`, `timeRange: { start, end }`
2. For each branch: call `getCommitsInRange()`
3. For each commit array: `summarizeActivity()` → `categorizeCommits()`
4. Summarize: `generateTimePeriodSummary()`
5. Output: write JSON to `outputPath`

**File Changes Analysis Flow:**
1. Input: `files`, `branches`
2. For each file: get history per branch via `getFileHistory()`
3. Analyze: `analyzeConflicts()` → `findOverlappingChanges()` → `datesOverlap()` logic
4. Assess: `assessRiskLevel()`, `generateConflictReasons()`
5. Summarize: `generateFileChangesSummary()`
6. Output: write JSON to `outputPath`

**Merge Recommendations Flow:**
1. Input: `branches`
2. Strategy: `determineMergeStrategy()` (picks base by commit count)
3. Risk: `assessConflictRisks()` (finds overlapping file changes)
4. Steps: `generateMergeSteps()` (static step list)
5. Output: write JSON to `outputPath`

## Unit Testing Considerations (if implemented)

**Stateless Functions to Mock:**
- `datesOverlap()` - Pure function, no side effects
  ```typescript
  // Example test pattern:
  expect(datesOverlap(
    new Date('2025-01-01'),
    new Date('2025-01-31'),
    new Date('2025-01-15'),
    new Date('2025-02-15')
  )).toBe(true);
  ```

- `assessRiskLevel()` - Pure function, deterministic
  ```typescript
  expect(assessRiskLevel([])).toBe('low');
  expect(assessRiskLevel([{}, {}])).toBe('medium');
  expect(assessRiskLevel([{}, {}, {}])).toBe('high');
  ```

- `categorizeCommits()` - Logic-based transformation
  ```typescript
  const commits = [
    { message: 'feat: add feature' },
    { message: 'fix: bug fix' },
  ];
  expect(categorizeCommits(commits)).toEqual({
    feature: 1, fix: 1, refactor: 0, docs: 0, other: 0
  });
  ```

**Functions Requiring Mock Git:**
- All methods calling `execSync()` with git commands
- Would need to mock child_process.execSync
- Example pattern (if using Jest):
  ```typescript
  jest.mock('child_process', () => ({
    execSync: jest.fn(() => '1a2b3c|2025-01-01T10:00:00Z|feat: test'),
  }));
  ```

**Functions Requiring Mock File System:**
- `writeFileSync()` calls in handlers
- Would need to mock fs module
- Example pattern:
  ```typescript
  jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
  }));
  ```

## Testing Strategy Recommendations

If adding a test runner, follow this approach:

**1. Pure Logic Tests (no mocks):**
- `datesOverlap()` - Date range overlap logic
- `assessRiskLevel()` - Risk classification
- `riskToNumber()` - Risk level mapping
- `categorizeCommits()` - Commit message pattern matching

**2. Git Command Tests (mock execSync):**
- `getLastCommit()` - Parse commit hash|date|message
- `getCommitCount()` - Parse integer count
- `getCommitsInRange()` - Parse multi-line output with date filtering
- `getFileHistory()` - Parse file change history

**3. Analysis Pipeline Tests (mock execSync + fs):**
- `handleBranchOverview()` - Full flow validation
- `handleTimePeriodAnalysis()` - Full flow validation
- `handleFileChangesAnalysis()` - Full flow validation
- `handleMergeRecommendations()` - Full flow validation

**4. Integration Tests (use real git repo):**
- Clone test repository to temp directory
- Run handlers against real branch data
- Verify output JSON structure and content
- Clean up temp repository after test

## Code Coverage Analysis

**Not currently tracked** - No coverage tooling configured.

**Recommendations for coverage targets:**

**High Priority (should test):**
- Parameter validation in all four tool handlers
- Risk assessment logic (datesOverlap, assessRiskLevel, categorizeCommits)
- Error handling paths

**Medium Priority:**
- Summary generation methods
- Data transformation pipelines

**Low Priority:**
- Git command building (regex-based, well-tested in practice)
- Specific field extraction from command output

## Manual Verification Checklist (until tests added)

When manually testing via MCP Inspector:

**Branch Overview:**
- [ ] Returns all requested branches in overview
- [ ] Commit counts are accurate
- [ ] Merge bases calculated correctly
- [ ] Summary aggregates correctly

**Time Period Analysis:**
- [ ] Respects start/end date filters
- [ ] Categorizes commits by type
- [ ] Summary shows correct branch count

**File Changes Analysis:**
- [ ] Tracks file changes per branch
- [ ] Identifies parallel development (conflicts)
- [ ] Risk levels assigned based on overlap count

**Merge Recommendations:**
- [ ] Selects base branch with most commits
- [ ] Identifies hotspot files (changed in multiple branches)
- [ ] Provides actionable merge steps

---

*Testing analysis: 2026-02-07*
