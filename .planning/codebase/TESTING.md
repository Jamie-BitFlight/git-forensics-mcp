# Testing Patterns

**Analysis Date:** 2026-02-07

## Test Framework

**Current Status:**

- No test runner configured (Jest, Vitest, Mocha, etc.)
- No automated test suite
- Per CLAUDE.md: "No test runner or linter is currently configured."

**Manual Testing Approach:**

- MCP Inspector CLI for testing server tools
- Manual verification of JSON output files

**Run Commands:**

```bash
pnpm tools:list           # List available tools via inspector

# Test specific tool with inspector
pnpm inspect:method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=$(pwd) \
  --tool-arg 'branches=["main"]' \
  --tool-arg outputPath=/tmp/test.json
```

## Test File Organization

**Current State:**

- No test files present in repository
- All testing is manual via MCP Inspector CLI
- No separate test directories

**Where Tests Should Go (if implemented):**

- Suggested pattern: `src/index.test.ts` or `src/index.spec.ts`
- Could organize by tool:
  - `__tests__/branch-overview.test.ts`
  - `__tests__/time-period.test.ts`
  - `__tests__/file-changes.test.ts`
  - `__tests__/merge-recommendations.test.ts`

## Testing Approach

**Manual Testing Pattern:**

Tools are tested manually using the MCP Inspector CLI. Test sequence:

1. Start server via `pnpm start` or via inspector
2. Invoke tool with `pnpm inspect:method tools/call`
3. Verify JSON output file at `outputPath`
4. Check for expected structure and data

**Example Testing Flow:**

```bash
# Build first
pnpm build

# Test branch overview tool
pnpm inspect:method tools/call \
  --tool-name get_branch_overview \
  --tool-arg repoPath=/path/to/repo \
  --tool-arg 'branches=["main","develop"]' \
  --tool-arg outputPath=/tmp/overview.json

# Verify output
cat /tmp/overview.json | jq '.'
```

## What to Test (if test suite added)

**Tool Invocation:**

- Tool parameter validation in `src/index.ts` lines 184-210:
  - Missing `repoPath` throws `McpError(ErrorCode.InvalidParams)`
  - Missing `branches` throws error
  - Missing `outputPath` throws error
  - Invalid tool name throws `McpError(ErrorCode.MethodNotFound)`

**Handler Methods (lines 227-341):**

- `handleBranchOverview`: validates output contains branch summary and overview
- `handleTimePeriodAnalysis`: validates commits filtered by date range correctly
- `handleFileChangesAnalysis`: validates file conflict analysis
- `handleMergeRecommendations`: validates merge strategy recommendations

**Git Operations (lines 343-399):**

- `getLastCommit`: parses git log output correctly
- `getCommitCount`: returns numeric count
- `getMergeBase`: identifies common ancestor
- `getCommitsInRange`: filters by time range
- `getFileHistory`: retrieves commit history for specific file

**Analysis Methods (lines 401-604):**

- `categorizeCommits`: classifies commits by message prefix (feat/fix/refactor/docs/other)
- `findOverlappingChanges`: identifies time range overlaps between branches
- `assessRiskLevel`: returns low/medium/high based on overlap count
- `determineMergeStrategy`: recommends base branch (most commits)
- `assessConflictRisks`: identifies file hotspots changed in multiple branches

**Error Handling:**

- Git command failures return `{isError: true}` response
- Invalid parameters throw errors caught by handler
- Unknown tools return method not found error

## Mocking Strategy (if tests implemented)

**What to Mock:**

- `execSync` from `child_process` — git commands should return predictable output
- `writeFileSync` from `fs` — capture written JSON, don't write to disk in tests
- File system operations

**Mocking Pattern Example:**

```typescript
import { execSync } from 'child_process';
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// In test
(execSync as jest.Mock).mockReturnValue('abc123|2024-01-01T00:00:00Z|feat: test commit\n');

// Or for multiple calls
const execSyncMock = execSync as jest.Mock;
execSyncMock
  .mockReturnValueOnce('abc123') // first call
  .mockReturnValueOnce('5') // second call
  .mockReturnValueOnce('def456'); // third call
```

**What NOT to Mock:**

- Core analysis methods like `categorizeCommits`, `findOverlappingChanges` — test actual logic
- Type parsing and transformation logic
- Risk assessment algorithms

## Data Fixtures (if tests implemented)

**Git Log Output Fixtures:**

```typescript
// Mock git log output with pipe-delimited format used in src/index.ts
const mockGitLogOutput = `abc123|2024-01-15T10:30:00Z|feat: add new feature
def456|2024-01-14T09:15:00Z|fix: resolve bug
ghi789|2024-01-13T14:45:00Z|docs: update README`;

// Mock git commit count
const mockCommitCount = '42\n';

// Mock git merge-base
const mockMergeBase = 'xyz789\n';
```

**Test Data Organization:**

- Location: `src/__fixtures__/` or inline in test files (given single-file codebase)
- Fixture format: pipe-delimited strings matching git command output
- File format examples:
  - `hash|date|message` for log output
  - Numeric string for commit counts
  - Hash string for merge bases

## Coverage

**Current Status:**

- No coverage configured or tracked
- Manual testing only
- No coverage requirements enforced

**If Coverage Added:**

- Aim for high coverage of core analysis methods (lines 401-617)
- Handler methods (lines 227-341) should have full coverage
- Git operation wrappers (lines 343-399) should test both success and error cases

## Test Organization Strategy (for future implementation)

**Recommended Test Suite Structure:**

```
src/
  index.ts                    # Main server code
  __tests__/
    index.test.ts            # Unit tests for all methods
    fixtures.ts              # Mock git output data
    integration.test.ts      # Full tool invocation tests
```

**By Test Type:**

**Unit Tests:**

- Individual methods with mocked dependencies
- Examples: `categorizeCommits()`, `assessRiskLevel()`, `findOverlappingChanges()`
- Mock execSync for git operations
- Test with sample data

**Integration Tests:**

- Full tool invocation through request handler
- Mock execSync to return realistic git output
- Verify complete JSON output structure
- Test error paths (invalid params, missing params)

**Manual Tests (current approach):**

- Via MCP Inspector CLI
- Verify against real git repositories
- Check JSON output structure and content
- Example workflows documented in CLAUDE.md (lines 20-29)

## Error Testing

**Current Error Handling (src/index.ts lines 179-224):**

```typescript
try {
  switch (request.params.name) {
    case 'get_branch_overview': {
      const args = request.params.arguments as unknown as BranchOverviewArgs;
      if (!args?.repoPath || !args?.branches || !args?.outputPath) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
      }
      // ... execution
    }
  }
} catch (error) {
  return {
    content: [{ type: 'text', text: `Git analysis error: ...` }],
    isError: true,
  };
}
```

**Test Scenarios (if implemented):**

- Missing required parameter → McpError with InvalidParams
- Unknown tool name → McpError with MethodNotFound
- Git command fails → return error response with isError: true
- Invalid branch name → git command error caught and returned
- File write error → caught in handler

---

_Testing analysis: 2026-02-07_
