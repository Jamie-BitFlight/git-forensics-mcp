# Codebase Concerns

**Analysis Date:** 2026-02-07

## Security Issues

### 1. Command Injection via Unsanitized Shell Arguments

**Risk:** HIGH

**Problem:** Branch names, file paths, and date strings are interpolated directly into `execSync()` shell commands without quoting or sanitization. A malicious MCP client can inject arbitrary shell commands via crafted inputs.

**Affected Files:**

- `src/index.ts` lines 344, 353, 359, 370-371, 387-388, 507-508

**Example Vulnerable Code:**

```typescript
// Line 370-371: timeRange.start and timeRange.end are unquoted
git log --format="%H|%aI|%s" --after="${timeRange.start}" --before="${timeRange.end}" ${branch}

// Line 387: file path is unquoted
git log --format="%H|%aI|%s" ${branch} -- ${file}
```

**Impact:** Remote code execution. An attacker providing `branch = "main'; rm -rf /'` or `file = "$(malicious-command)"` could execute arbitrary commands with the process's permissions.

**Fix Approach:**

- Quote all interpolated values with single quotes, or
- Use `execFileSync()` with argument arrays instead of shell string concatenation, or
- Validate inputs against whitelist of allowed branch/file names, or
- Use `--` to separate git options from user inputs

**Priority:** Critical - must fix before production use

---

### 2. Arbitrary File Write via Unvalidated `outputPath`

**Risk:** MEDIUM

**Problem:** `writeFileSync(args.outputPath, ...)` writes to any path the MCP client provides without validation. Could overwrite arbitrary files the process has permission to write.

**Affected Files:**

- `src/index.ts` lines 254, 281, 312, 331

**Example:**

```typescript
// Client provides: outputPath = "/etc/passwd"
writeFileSync(args.outputPath, JSON.stringify(analysis, null, 2));
```

**Impact:** Denial of service by overwriting critical files, or privilege escalation if process runs with elevated permissions.

**Fix Approach:**

- Validate `outputPath` is within a safe, explicitly-allowed directory, or
- Return analysis results directly in MCP response body instead of writing files, or
- Use a temporary directory with restricted permissions and require absolute paths

**Priority:** High - consider before production deployment

---

## Known Bugs

### 3. Pipe Delimiter in Commit Messages Truncates Parsed Message

**Risk:** MEDIUM

**Problem:** Commit messages containing `|` character get truncated. The parser uses `split('|')` to split `%H|%aI|%s` format, but commit messages containing pipe characters are split incorrectly — only text before the first `|` in the message is captured.

**Affected Files:**

- `src/index.ts` lines 347, 380, 396 (getLastCommit, getCommitsInRange, getFileHistory)

**Example:**

```typescript
// If message is "fix: merge A | B"
const [hash, date, message] = line.split('|');
// message becomes "fix: merge A" instead of "fix: merge A | B"
```

**Impact:** Lost information in analysis results. Users won't see complete commit messages when messages contain pipes, making analysis unreliable.

**Fix Approach:**

- Use `split('|', 3)` to split only first 2 occurrences and rejoin remainder as message, or
- Switch to NUL byte delimiter (`%x00`) which cannot appear in commit messages:
  ```
  git log --format="%H%x00%aI%x00%s"
  ```

**Priority:** Medium - impacts data accuracy

---

### 4. Invalid Date Objects When File History is Empty

**Risk:** LOW

**Problem:** When a branch has no history for a file, `history[0]?.date` or `history[history.length-1]?.date` returns `undefined`. This feeds `new Date(undefined)` into `datesOverlap()`, creating an Invalid Date object. Currently works by accident (Invalid Date comparisons return false), but is fragile.

**Affected Files:**

- `src/index.ts` lines 448-462 (findOverlappingChanges)

**Example:**

```typescript
// If history is empty:
history[history.length - 1]?.date; // → undefined
new Date(undefined); // → Invalid Date
```

**Impact:** Silent failures and fragile logic. Future changes could break when Invalid Date behavior changes.

**Fix Approach:**

- Guard before constructing dates: skip branches with empty history, or
- Explicitly check and handle undefined:
  ```typescript
  if (!history[0]?.date || !history[history.length - 1]?.date) {
    return; // skip this branch pair
  }
  ```

**Priority:** Low - currently masked but fragile

---

### 5. `assessConflictRisks` Always Diffs Against First Branch

**Risk:** LOW

**Problem:** Line 508 hardcodes `branches[0]` as the diff baseline: `git merge-base ${branches[0]} ${branch}`. When `branch === branches[0]`, this produces an empty diff (wasteful). For other branches, changes are always relative to the first branch rather than pairwise or against common ancestor.

**Affected Files:**

- `src/index.ts` lines 503-533 (assessConflictRisks)

**Example:**

```typescript
// If branches = ["main", "feature1", "feature2"]
// feature2 diffs are relative to main, not pairwise
// This may not match user expectations for true multi-branch analysis
```

**Impact:** Merge risk assessment may not reflect actual conflicts between non-primary branches.

**Fix Approach:**

- Skip self-comparison: `if (branch === branches[0]) return`, or
- Document the intended behavior (diff against primary branch), or
- Implement pairwise comparison for all branch pairs

**Priority:** Low - behavioral question, not a crash

---

## Code Quality Issues

### 6. Hardcoded Server Version Drifts from package.json

**Risk:** LOW

**Problem:** Server reports `version: '0.1.0'` to MCP clients (line 49) while `package.json` is at version `0.5.2`. Version drifts silently on every release, confusing clients and users about which version is running.

**Affected Files:**

- `src/index.ts` line 49-50

**Impact:** Version mismatch confusion, difficulty debugging version-specific issues.

**Fix Approach:**

- Read version from `package.json` at runtime:
  ```typescript
  import { readFileSync } from 'fs';
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
  version: pkg.version;
  ```
- Or use a build-time injection step

**Priority:** Low - cosmetic but unprofessional

---

### 7. Unused Import `join` from `path` Module

**Risk:** TRIVIAL

**Problem:** Line 12 imports `join` but it's never used in the codebase.

**Affected Files:**

- `src/index.ts` line 12

**Impact:** Code bloat, unused dependency tracking.

**Fix Approach:** Remove the import

**Priority:** Trivial - cleanup

---

### 8. `generateMergeSteps` Ignores Its Parameters

**Risk:** LOW

**Problem:** Method accepts `repoPath` and `branches` parameters (line 535) but returns a hardcoded static array (lines 536-545). Appears data-driven but always returns the same generic guidance.

**Affected Files:**

- `src/index.ts` lines 535-545

**Example:**

```typescript
private generateMergeSteps(repoPath: string, branches: string[]) {
  return [
    'Create backup branches',
    'Create integration branch from recommended base',
    // ... always the same steps, branches param unused
  ];
}
```

**Impact:** Misleading API. Users think merge steps are context-aware but they're always generic.

**Fix Approach:**

- Generate steps based on actual branch metrics (conflicts, commit counts, etc.), or
- Remove parameters and document these are generic guidance

**Priority:** Low - misleading but not broken

---

### 9. `determineMergeStrategy` Always Returns `cherry-pick`

**Risk:** LOW

**Problem:** Method always returns `approach: 'cherry-pick'` (line 495) regardless of branch analysis. Only `recommendedBase` varies; strategy is hardcoded.

**Affected Files:**

- `src/index.ts` lines 485-501

**Example:**

```typescript
return {
  recommendedBase: baseChoice.branch,
  approach: 'cherry-pick',  // ← always hardcoded
  reasoning: [...]
};
```

**Impact:** Merge strategy recommendations are not context-aware. Should recommend merge vs rebase vs cherry-pick based on branch divergence and conflict count.

**Fix Approach:**

- Implement actual strategy selection logic:
  - Few conflicts + linear history → merge
  - Many conflicts → cherry-pick
  - Recent divergence → rebase

**Priority:** Low - feature gap, not a bug

---

### 10. Double Type Cast Bypasses TypeScript Validation

**Risk:** MEDIUM

**Problem:** Lines 183, 190, 197, 204 use `as unknown as T` to bypass TypeScript type checking. Combined with only truthy field checks, there's no validation that arrays are actually arrays, objects have correct shape, strings are non-empty, etc.

**Affected Files:**

- `src/index.ts` lines 183, 190, 197, 204

**Example:**

```typescript
const args = request.params.arguments as unknown as BranchOverviewArgs;
if (!args?.repoPath || !args?.branches || !args?.outputPath) {
  // Only checks truthy, not type safety
  // branches could be a string, number, null, etc.
}
```

**Impact:** Invalid inputs bypass validation. A client sending `branches = "main"` instead of `["main"]` passes the truthy check but will crash downstream.

**Fix Approach:**

- Use runtime validation library (zod, joi, io-ts), or
- Add explicit type checks:
  ```typescript
  if (!Array.isArray(args.branches)) throw error;
  if (typeof args.outputPath !== 'string') throw error;
  ```

**Priority:** Medium - reduces robustness

---

### 11. Async Methods with No Await

**Risk:** TRIVIAL

**Problem:** All four handler methods (lines 227, 266, 293, 324) are declared `async` but perform only synchronous work (`execSync`, `writeFileSync`). The `async` keyword is vestigial.

**Affected Files:**

- `src/index.ts` lines 227, 266, 293, 324

**Impact:** Misleading API suggests async operations, but they block the event loop synchronously.

**Fix Approach:**

- Remove `async` keyword, or
- Migrate to `execFile()` (async) with promises if moving away from synchronous execution in the future

**Priority:** Trivial - cleanup

---

### 12. O(n²) Shell Invocations for Merge Base Calculation

**Risk:** MEDIUM

**Problem:** `handleBranchOverview` (lines 231-239) calls `getMergeBase()` for each branch against every other branch. With `n` branches this spawns `n*(n-1)` synchronous processes. Merge base is symmetric (`A-B === B-A`) but both directions are computed. With 10 branches this is 90 spawn calls instead of 45.

**Affected Files:**

- `src/index.ts` lines 228-246

**Example:**

```typescript
branches.map((branch) => {
  mergeBase: args.branches
    .map((otherBranch) => {
      // For each branch, call merge-base against ALL others
      this.getMergeBase(..., branch, otherBranch)
    })
})
// With 5 branches: 5*4 = 20 execSync calls
```

**Impact:** Performance degrades quadratically with branch count. Slow analysis for repositories with many branches.

**Fix Approach:**

- Cache merge base results keyed by `[branchA, branchB].sort().join('|')`
- Only compute each pair once: `n*(n-1)/2` instead of `n*(n-1)`

**Priority:** Medium - performance, worse with many branches

---

### 13. `generateFileChangesSummary` Mutates Input Array

**Risk:** TRIVIAL

**Problem:** Line 598 calls `analysis.sort(...)` which sorts in place, silently mutating the input array. Calling code's data order changes as a side effect.

**Affected Files:**

- `src/index.ts` lines 597-601

**Example:**

```typescript
// Caller's analysis array order is changed
const analysis = [...];  // [file1, file2, file3]
generateFileChangesSummary(analysis);
// After call: analysis is now [file3, file1, file2] (resorted by risk)
```

**Impact:** Surprising side effects. If caller expects stable order, behavior is unexpected.

**Fix Approach:**

- Use non-mutating sort: `[...analysis].sort(...)` or `analysis.toSorted(...)`

**Priority:** Trivial - unexpected behavior but low impact

---

### 14. Risk Level Untyped as String

**Risk:** LOW

**Problem:** Risk level is passed as generic `string` throughout codebase rather than union type `'low' | 'medium' | 'high'`. The `riskToNumber` fallback `default: return 0` implies impossible state.

**Affected Files:**

- `src/index.ts` lines 473-477, 526, 589, 606

**Example:**

```typescript
private assessRiskLevel(overlaps: Array<{ branches: string[] }>): string {
  // Returns untyped 'low' | 'medium' | 'high' but declared as string
  if (overlaps.length === 0) return 'low';
}

private riskToNumber(risk: string): number {
  // default case suggests invalid input
  default: return 0;  // ← when could this happen?
}
```

**Impact:** No type safety for risk levels. Could accidentally pass 'critical' or 'unknown' and hit fallback case silently.

**Fix Approach:**

```typescript
type RiskLevel = 'low' | 'medium' | 'high';
private assessRiskLevel(overlaps: Array<...>): RiskLevel { ... }
private riskToNumber(risk: RiskLevel): number { ... }
```

**Priority:** Low - type safety improvement

---

### 15. Error Handler Swallows MCP Error Codes

**Risk:** MEDIUM

**Problem:** The catch block (lines 213-223) converts all errors — including `McpError` with specific codes like `InvalidParams` and `MethodNotFound` — into generic `{isError: true}` text response. MCP clients cannot distinguish between validation errors, unknown tools, and git failures.

**Affected Files:**

- `src/index.ts` lines 213-223

**Example:**

```typescript
try {
  // throws McpError(ErrorCode.InvalidParams, 'Missing required parameters')
} catch (error) {
  return {
    content: [{ type: 'text', text: `Git analysis error: ...` }],
    isError: true, // ← loses error code
  };
}
```

**Impact:** Poor error diagnostics. Clients can't tell if the tool itself is broken vs parameter validation vs git repo access.

**Fix Approach:**

- Re-throw `McpError` instances to preserve error codes:
  ```typescript
  if (error instanceof McpError) throw error;
  // Only catch and wrap unexpected errors
  ```

**Priority:** Medium - diagnostic quality

---

## Test Coverage Gaps

### No Automated Tests

**Risk:** HIGH

**Problem:** The project has no test runner or linter configured (noted in CLAUDE.md line 31). No unit, integration, or E2E tests exist. All validation is manual.

**Affected Files:**

- All of `src/index.ts`

**Impact:**

- Regressions go undetected until runtime
- Security fixes (e.g., command injection) cannot be verified to work
- Changes to complex logic (merge base, conflict detection) are risky
- New contributor confidence is low

**Missing Coverage:**

- Command injection vulnerability fixes
- Edge cases: empty branches, circular dates, no merge base
- Commit message parsing with special characters (pipes, newlines)
- File path handling with spaces and special characters
- Large repository performance
- MCP protocol compliance

**Fix Approach:**

- Add Jest or Vitest configuration
- Create test suite for:
  - Input validation (security)
  - Core git operations (mocking git commands)
  - Analysis logic (conflict detection, risk assessment)
  - MCP protocol compliance
- Aim for 80%+ coverage of business logic

**Priority:** Critical - especially for security fixes

---

## Dependencies at Risk

### MCP SDK Version Pinned to `latest`

**Risk:** MEDIUM

**Problem:** `package.json` line 28 pins `@modelcontextprotocol/sdk` to `"latest"`. This means pnpm installs will pull different versions on different machines/times, breaking reproducibility and making versioning unpredictable.

**Affected Files:**

- `package.json` line 28

**Impact:**

- `pnpm-lock.yaml` will diverge from main branch
- CI builds may have different SDK than development
- Harder to track which version introduced a bug
- Release versions may have inconsistent dependencies

**Fix Approach:**

- Pin to specific version: `"@modelcontextprotocol/sdk": "^0.17.1"`
- Or pin major.minor: `"@modelcontextprotocol/sdk": "0.17.x"`
- Review CHANGELOG before updating

**Priority:** Medium - reproducibility

---

## Scaling & Performance Limits

### Synchronous Execution Blocks Event Loop

**Risk:** MEDIUM

**Problem:** All git operations use `execSync()` which blocks until the command completes. With large repositories or slow disks, this blocks the entire MCP server, unable to handle concurrent requests or timeouts.

**Affected Files:**

- `src/index.ts` throughout (all git operations)

**Example Scenarios:**

- Large repository: `git log` on 100k commits takes 5+ seconds, blocking server
- Multiple concurrent clients: second client waits for first to finish
- Timeout impossible: no way to interrupt long-running analysis

**Impact:**

- Server appears frozen to concurrent clients
- Cannot scale to multiple users
- No way to cancel analysis
- CPU usage during analysis is inefficient

**Fix Approach:**

- Migrate to `execFile()` with promises
- Implement timeout handling via `AbortController`
- Allow concurrent analysis requests

**Priority:** Medium - impacts multi-user scenarios

---

### Memory Usage with Large Repositories

**Risk:** LOW

**Problem:** The entire git output is loaded into memory before parsing. For repositories with hundreds of thousands of commits, the output strings could be very large.

**Affected Files:**

- `src/index.ts` lines 369-382 (getCommitsInRange), 385-398 (getFileHistory)

**Example:**

```typescript
const output = execSync(`...git log...`, { encoding: 'utf8' });
// If 100k commits, output might be 50MB+ string in memory
output.trim().split('\n').filter(Boolean).map(...)
```

**Impact:** OOM crashes on very large repositories or wide time ranges.

**Fix Approach:**

- Stream output line by line instead of loading all at once
- Use `--pretty=format` with early termination flags

**Priority:** Low - only affects very large repos

---

## Missing Features

### No Input Validation Library

**Risk:** MEDIUM

**Problem:** No schema validation (zod, joi, io-ts). Manual truthy checks are error-prone and don't catch invalid types.

**Affected Files:**

- `src/index.ts` lines 184, 191, 198, 205

**Impact:** Subtle bugs when clients send malformed input. Type coercion surprises.

**Fix Approach:**

- Add zod: `npm install zod`
- Define schemas for each tool's arguments
- Validate before execution

**Priority:** Medium - robustness

---

## Summary

**Critical Issues:** 2

- Command injection (security)
- No test coverage

**High Issues:** 3

- Arbitrary file write
- Server version mismatch
- No input validation

**Medium Issues:** 7

- Pipe delimiter bug
- Double type cast
- Error code swallowing
- Hardcoded strategies
- O(n²) performance
- Dependency pinning
- Synchronous blocking

**Low Issues:** 6

- Invalid Date handling
- generateMergeSteps parameters
- Risk level typing
- Merge base branch selection
- Unused imports
- Memory scaling

---

_Concerns audit: 2026-02-07_
