# Architecture

**Analysis Date:** 2026-02-07

## Pattern Overview

**Overall:** Model Context Protocol (MCP) stdio server with synchronous git analysis

**Key Characteristics:**

- Single-class design with tool-handler pattern
- Synchronous git execution via `execSync` for blocking operations
- Request-response architecture via JSON-RPC over stdio
- Analysis results written to file paths rather than returned directly
- All functionality contained in one file: `src/index.ts` (~627 lines)

## Layers

**Transport/Protocol Layer:**

- Purpose: Handle JSON-RPC communication with MCP clients over stdio
- Location: `src/index.ts` (lines 2-12, 619-623)
- Contains: StdioServerTransport setup, Server initialization, SIGINT handler
- Depends on: `@modelcontextprotocol/sdk` (Server, StdioServerTransport)
- Used by: GitAnalysisServer constructor and run() method

**Tool Registration Layer:**

- Purpose: Define MCP tool schemas and register request handlers
- Location: `src/index.ts` (lines 68-225)
- Contains: Tool definitions (get_branch_overview, analyze_time_period, analyze_file_changes, get_merge_recommendations), JSON Schema input validation
- Depends on: Tool handler layer
- Used by: MCP clients discovering and calling tools

**Tool Handler Layer:**

- Purpose: Receive tool requests, validate parameters, coordinate analysis
- Location: `src/index.ts` (lines 227-341)
- Contains: Four async handlers (handleBranchOverview, handleTimePeriodAnalysis, handleFileChangesAnalysis, handleMergeRecommendations)
- Depends on: Git command execution layer, analysis layer
- Used by: CallToolRequestSchema request handler

**Git Command Execution Layer:**

- Purpose: Execute git commands and parse output into typed objects
- Location: `src/index.ts` (lines 343-399)
- Contains: getLastCommit, getCommitCount, getMergeBase, getCommitsInRange, getFileHistory
- Depends on: Node.js `child_process.execSync`
- Used by: Analysis layer and tool handlers

**Analysis Layer:**

- Purpose: Analyze git data and generate insights for merge strategies, conflicts, risks
- Location: `src/index.ts` (lines 401-617)
- Contains: Activity summarization, commit categorization, conflict detection, risk assessment, merge strategy determination, hotspot detection
- Depends on: Git command execution layer
- Used by: Tool handlers, summary generators

**Summary/Output Layer:**

- Purpose: Generate human-readable summaries and write results to JSON files
- Location: `src/index.ts` (lines 547-617, 254, 281, 312, 331)
- Contains: generateOverviewSummary, generateTimePeriodSummary, generateFileChangesSummary, writeFileSync calls
- Depends on: Analysis layer
- Used by: Tool handlers for final result serialization

## Data Flow

**Branch Overview Request:**

1. MCP client sends `CallToolRequestSchema` with tool name `get_branch_overview`, repoPath, branches array, outputPath
2. CallToolRequestSchema handler validates parameters, calls `handleBranchOverview(args)`
3. Handler maps over each branch:
   - Calls `getLastCommit()` → executes `git log -1` → parses hash|date|message
   - Calls `getCommitCount()` → executes `git rev-list --count` → parseInt result
   - For each other branch, calls `getMergeBase()` → executes `git merge-base`
4. Results collected into overview array with lastCommit, commitCount, mergeBase relationships
5. `generateOverviewSummary()` computes totalBranches, totalCommits, averageCommitsPerBranch, mostActiveBranch
6. Analysis object written to outputPath via `writeFileSync()`
7. Handler returns success message with file path

**Time Period Analysis Request:**

1. MCP client sends request with branches, timeRange {start, end}, outputPath
2. Handler maps over each branch:
   - Calls `getCommitsInRange()` → executes `git log --after/--before` → parses line-delimited output
   - Calls `summarizeActivity()` which:
     - Extracts totalCommits, firstCommit, lastCommit from commits array
     - Calls `categorizeCommits()` to count feat/fix/refactor/docs/other by regex pattern matching
3. Results collected with branch activity summaries
4. `generateTimePeriodSummary()` aggregates totalCommits, branchesWithActivity, mostActiveBy
5. Result written to JSON file
6. Handler returns success message

**File Changes Analysis Request:**

1. MCP client sends request with files array, branches array, outputPath
2. Handler maps over each file:
   - For each branch, calls `getFileHistory()` → executes `git log -- {file}` → parses commits
   - Calls `analyzeConflicts()` which:
     - Calls `findOverlappingChanges()` to detect temporal overlap between branch modifications
     - Uses `datesOverlap()` to compare date ranges
     - Calls `assessRiskLevel()` to map overlap count (0→low, 1-2→medium, 3+→high)
     - Generates conflict reasons for each overlapping branch pair
3. Analysis includes file-by-file conflict risk levels
4. `generateFileChangesSummary()` counts filesWithConflicts, highRiskFiles, creates recommendedReviewOrder
5. Result written to JSON file
6. Handler returns success message

**Merge Recommendations Request:**

1. MCP client sends request with branches array, outputPath
2. Handler calls three analysis methods:
   - `determineMergeStrategy()`:
     - Counts commits on each branch
     - Selects branch with most commits as recommendedBase
     - Returns strategy (cherry-pick) with reasoning
   - `assessConflictRisks()`:
     - For each branch, executes `git diff --name-only {merge-base}..{branch}`
     - Builds Map<filename, branches> tracking which branches modify each file
     - Identifies hotspots (files modified by multiple branches)
     - Returns overallRisk based on hotspot count with recommendations
   - `generateMergeSteps()`:
     - Returns hardcoded sequence of merge steps
3. Recommendations object with strategy, conflictRisks, steps written to JSON
4. Handler returns success message

**State Management:**

- No persistent state: server is stateless between requests
- Per-request state: arguments validated and passed through handler chain
- Results persisted to disk: output files are the only storage mechanism
- Git state: server queries live repository state via execSync (no caching)

## Key Abstractions

**Tool Request Interface:**

- Purpose: Type-safe parameter handling for each tool
- Examples: `BranchOverviewArgs` (line 14-18), `TimePeriodArgs` (line 20-28), `FileChangesArgs` (line 30-35), `MergeRecommendationsArgs` (line 37-41)
- Pattern: Interface with required fields, validated in CallToolRequestSchema handler before handler invocation

**Commit Object Pattern:**

- Purpose: Uniform representation of git log output
- Example: `{ hash: string; date: string; message: string; branch?: string }`
- Pattern: Parsed from pipe-delimited git log output (`git log --format="%H|%aI|%s"`)

**Git Command Execution Pattern:**

- Purpose: Consistent, safe git command execution across codebase
- Examples: `getLastCommit()`, `getCommitCount()`, `getMergeBase()`, `getCommitsInRange()`, `getFileHistory()`
- Pattern: All use `execSync(\`cd "${repoPath}" && git ...\``, { encoding: 'utf8' })
- Benefits: No shell injection risk (template literals), consistent encoding, always changes directory first

**Commit Categorization Pattern:**

- Purpose: Classify commits by type based on message prefix
- Example: `categorizeCommits()` (lines 412-430)
- Pattern: Regex matching on message (feat/add → feature, fix/bug → fix, refactor/style/chore → refactor, docs → docs, else → other)
- Used by: Activity summarization, merge recommendations

**Risk Assessment Pattern:**

- Purpose: Quantify merge risk as low/medium/high
- Examples: `assessRiskLevel()` (lines 473-477), `assessConflictRisks()` (lines 503-533)
- Pattern: Count-based thresholds - 0 overlaps → low, 1-2 overlaps → medium, 3+ overlaps → high; 5+ hotspots → high, 0+ hotspots → medium/low
- Applied to: File conflicts, overall merge complexity

**Overlap Detection Pattern:**

- Purpose: Find concurrent changes across branches
- Example: `findOverlappingChanges()` (lines 445-467), `datesOverlap()` (lines 469-471)
- Pattern: Extract time ranges from commit histories, use cartesian product to detect all pairwise overlaps
- Used by: File changes analysis, conflict assessment

## Entry Points

**CLI Entry:**

- Location: `src/index.ts` (line 1 shebang)
- Execution: `#!/usr/bin/env node` makes file executable with `pnpm build` (adds chmod +x)
- Invocation: Via npm bin `git-forensics-mcp` after installation

**Server Startup:**

- Location: `src/index.ts` (lines 626-627)
- Code: `const server = new GitAnalysisServer(); server.run().catch(console.error);`
- Flow: Creates instance → calls run() → new StdioServerTransport() → server.connect(transport)

**Tool Handlers:**

- Location: `src/index.ts` (lines 182-209 in switch statement)
- Triggers: MCP client sends CallToolRequestSchema with tool name
- Responsibilities: Validate parameters → execute analysis → write results → return status message

**Constructor/Initialization:**

- Location: `src/index.ts` (lines 46-66)
- Responsibilities: Create Server instance, call setupToolHandlers(), register error handler, register SIGINT handler

## Error Handling

**Strategy:** Parameter validation at entry point, return error objects rather than throw

**Patterns:**

- **Missing Parameters:** Lines 184-192 check for required fields, throw `McpError(ErrorCode.InvalidParams, 'Missing required parameters')`
- **Unknown Tool:** Line 211 throws `McpError(ErrorCode.MethodNotFound, ...)` for unregistered tool names
- **Execution Errors:** Lines 213-223 catch all errors in tool execution, return `{ isError: true, content: [{type: 'text', text: error.message}] }`
- **Server Errors:** Line 61 registers onerror handler to log MCP errors without crashing

## Cross-Cutting Concerns

**Logging:**

- Minimal logging: Error channel via `console.error()` (lines 61, 622)
- Server messages logged to stderr for visibility without interfering with stdout JSON-RPC
- No structured logging; using Node.js built-in console

**Validation:**

- Parameter validation at tool handler entry point (lines 184-206)
- Type assertions for arguments: `request.params.arguments as unknown as BranchOverviewArgs`
- No schema validation library; manual field checks (truthy checks for required properties)

**Git Operations:**

- All git commands use consistent pattern: `execSync(\`cd "${repoPath}" && git ...\`, { encoding: 'utf8' })`
- No shell escaping for branch/file parameters - potential vulnerability if untrusted input
- Synchronous execution blocks per tool (acceptable for MCP one-request-at-a-time pattern)

**Output Serialization:**

- All results written to JSON: `writeFileSync(args.outputPath, JSON.stringify(analysis, null, 2))`
- 2-space indentation for readability
- Caller responsible for creating output directory

---

_Architecture analysis: 2026-02-07_
