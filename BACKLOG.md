# Backlog

Identified issues from code review of `src/index.ts`.

## Security

### 1. Command injection via unsanitized shell arguments

**Severity**: HIGH
**Lines**: 344, 353, 359, 370, 387, 507-508

`branch`, `file`, `timeRange.start`, and `timeRange.end` are interpolated directly into `execSync` shell commands without quoting or sanitization. A malicious MCP client can execute arbitrary commands via crafted branch names, file paths, or date strings. `repoPath` is double-quoted but the others are not.

**Fix**: Sanitize all inputs. Use `--` to separate git options from refs/paths. Quote all interpolated values. Consider using `execFileSync` (no shell) with argument arrays instead of `execSync` with string concatenation.

### 2. Arbitrary file write via `outputPath`

**Severity**: MEDIUM
**Lines**: 254, 281, 312, 331

`writeFileSync(args.outputPath, ...)` writes to whatever path the MCP client provides with no validation. Could overwrite arbitrary files the process has access to.

**Fix**: Validate `outputPath` is within an allowed directory, or remove file-based output in favor of returning results directly via MCP response.

## Bugs

### 3. Pipe delimiter in commit messages truncates parsed message

**Severity**: MEDIUM
**Lines**: 347, 380, 396

`output.split('|')` is used to parse `%H|%aI|%s` format. Commit messages containing `|` get split incorrectly — only the text before the first `|` in the message is captured.

**Fix**: Use `split('|')` and rejoin elements 2+ as the message, or switch to a NUL byte delimiter (`%x00`) that cannot appear in commit messages.

### 4. `new Date(undefined)` when file history is empty

**Severity**: LOW
**Lines**: 448-462

When a branch has no history for a file, `history[0]?.date` returns `undefined`, which feeds `new Date(undefined)` (Invalid Date) into `datesOverlap`. Currently works by accident (Invalid Date comparisons return false), but fragile.

**Fix**: Guard `findOverlappingChanges` to skip branches with empty history before constructing Date objects.

### 5. `assessConflictRisks` always diffs against `branches[0]`

**Severity**: LOW
**Lines**: 507-508

`git merge-base ${branches[0]} ${branch}` is hardcoded. When `branch === branches[0]`, this produces an empty diff (wasteful). For other branches, changes are always relative to the first branch rather than pairwise, which may not match user expectations for multi-branch analysis.

**Fix**: Skip self-comparison. Consider whether pairwise comparison or comparison against a common ancestor is the intended behavior and document the choice.

## Code Smells

### 6. Hardcoded server version `'0.1.0'`

**Lines**: 49

Server reports `version: '0.1.0'` to MCP clients while `package.json` is at `0.5.2`. Version drifts silently on every release.

**Fix**: Read version from `package.json` at startup, or use a build step to inject it.

### 7. Unused import `join` from `path`

**Lines**: 12

`import { join } from 'path'` is never referenced.

**Fix**: Remove the import.

### 8. `generateMergeSteps` ignores its parameters

**Lines**: 535-545

Accepts `repoPath` and `branches` but returns a hardcoded static array. The merge recommendations tool appears data-driven but always returns the same canned steps.

**Fix**: Either generate context-aware steps using the parameters, or remove the parameters and document that steps are generic guidance.

### 9. `determineMergeStrategy` always returns `'cherry-pick'`

**Lines**: 495

`approach: 'cherry-pick'` is hardcoded regardless of input. Only `recommendedBase` varies.

**Fix**: Implement actual strategy selection (e.g., merge vs rebase vs cherry-pick) based on branch divergence, conflict count, or commit volume.

### 10. Double type cast `as unknown as` bypasses TypeScript

**Lines**: 183, 190, 197, 204

`request.params.arguments as unknown as T` disables all type checking. Combined with only truthy-checks on fields, there's no validation that `branches` is an array, `timeRange` has the correct shape, strings are non-empty, etc.

**Fix**: Use a runtime validation library (e.g., zod) to parse and validate arguments, or at minimum add `Array.isArray()` checks.

### 11. `async` methods with no `await`

**Lines**: 227, 266, 293, 324

All four handler methods are declared `async` but perform only synchronous work (`execSync`, `writeFileSync`). The `async` keyword is vestigial.

**Fix**: Remove `async` keyword, or migrate to `execFile` (async) with promises if moving away from synchronous execution.

### 12. O(n^2) shell invocations for merge base in `handleBranchOverview`

**Lines**: 231-239

For each branch, `getMergeBase` is called against every other branch. With `n` branches this spawns `n*(n-1)` synchronous shell processes. Merge base is also symmetric (`merge-base A B === merge-base B A`) but both directions are computed.

**Fix**: Cache merge base results and only compute each pair once (n*(n-1)/2 instead of n*(n-1)).

### 13. `generateFileChangesSummary` mutates caller's array via `.sort()`

**Lines**: 597-601

`analysis.sort(...)` sorts in place, silently mutating the array passed from `handleFileChangesAnalysis`. The caller's data order changes as a side effect of calling a "summary" method.

**Fix**: Use `[...analysis].sort(...)` or `analysis.toSorted(...)` to avoid mutating the input.

### 14. Risk level is untyped `string` throughout

**Lines**: 473-477, 526, 589, 606

Risk level is passed as `string` rather than a union type `'low' | 'medium' | 'high'`. The `riskToNumber` fallback `default: return 0` implies an impossible case.

**Fix**: Define `type RiskLevel = 'low' | 'medium' | 'high'` and use it in all signatures and return types.

### 15. Error handler swallows `McpError` error codes

**Lines**: 213-223

The catch block converts all errors — including `McpError` with specific codes like `InvalidParams` and `MethodNotFound` — into a generic `{isError: true}` text response. MCP clients cannot distinguish between validation errors, unknown tools, and git failures.

**Fix**: Re-throw `McpError` instances so the MCP SDK can return proper error codes to clients. Only catch and wrap unexpected errors.
