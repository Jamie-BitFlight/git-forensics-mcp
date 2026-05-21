#!/usr/bin/env tsx
/**
 * Validation script for git-forensics-mcp MCP server.
 *
 * Spawns `node build/index.js`, connects via MCP SDK stdio transport,
 * asserts all 4 tools are listed, calls each tool, and verifies output.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const REPO_PATH = process.env['REPO_PATH'] ?? process.cwd();
const TMP = mkdtempSync(join(tmpdir(), 'gfm-validate-'));

const EXPECTED_TOOLS = [
  'get_branch_overview',
  'analyze_time_period',
  'analyze_file_changes',
  'get_merge_recommendations',
] as const;

// Tool call configurations
const TOOL_CALLS: Array<{
  name: string;
  args: Record<string, unknown>;
  outputPath: string;
}> = [
  {
    name: 'get_branch_overview',
    args: {
      repoPath: REPO_PATH,
      branches: ['main'],
      outputPath: join(TMP, 'gfm-branch-overview.json'),
    },
    outputPath: join(TMP, 'gfm-branch-overview.json'),
  },
  {
    name: 'analyze_time_period',
    args: {
      repoPath: REPO_PATH,
      branches: ['main'],
      timeRange: {
        start: '2024-01-01',
        end: '2026-12-31',
      },
      outputPath: join(TMP, 'gfm-time-period.json'),
    },
    outputPath: join(TMP, 'gfm-time-period.json'),
  },
  {
    name: 'analyze_file_changes',
    args: {
      repoPath: REPO_PATH,
      branches: ['main'],
      files: ['src/index.ts', 'package.json'],
      outputPath: join(TMP, 'gfm-file-changes.json'),
    },
    outputPath: join(TMP, 'gfm-file-changes.json'),
  },
  {
    name: 'get_merge_recommendations',
    args: {
      repoPath: REPO_PATH,
      branches: ['main'],
      outputPath: join(TMP, 'gfm-merge-recommendations.json'),
    },
    outputPath: join(TMP, 'gfm-merge-recommendations.json'),
  },
];

interface ToolResult {
  toolName: string;
  passed: boolean;
  reason: string;
}

async function main(): Promise<void> {
  const results: ToolResult[] = [];
  let allPassed = true;

  // Resolve the path to node and the build output
  const serverPath = join(REPO_PATH, 'build', 'index.js');

  if (!existsSync(serverPath)) {
    console.error(`FATAL: Build output not found at ${serverPath}. Run 'pnpm build' first.`);
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  const client = new Client({ name: 'validate-script', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);
  } catch (err) {
    console.error(
      `FATAL: Could not connect to MCP server: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }

  // ── Step 1: Assert all 4 tools are listed ──────────────────────────────────
  let listedToolNames: string[] = [];
  try {
    const listResult = await client.listTools();
    listedToolNames = listResult.tools.map((t) => t.name);

    for (const expected of EXPECTED_TOOLS) {
      if (!listedToolNames.includes(expected)) {
        results.push({
          toolName: `tools/list[${expected}]`,
          passed: false,
          reason: `Tool '${expected}' not found in tools/list response (got: ${listedToolNames.join(', ')})`,
        });
        allPassed = false;
      } else {
        results.push({
          toolName: `tools/list[${expected}]`,
          passed: true,
          reason: 'Present in tools/list',
        });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    for (const expected of EXPECTED_TOOLS) {
      results.push({
        toolName: `tools/list[${expected}]`,
        passed: false,
        reason: `tools/list call failed: ${msg}`,
      });
    }
    allPassed = false;
  }

  // ── Step 2: Call each tool and validate output ─────────────────────────────
  for (const { name, args, outputPath } of TOOL_CALLS) {
    let toolPassed = true;
    let reason = 'OK';

    try {
      const callResult = await client.callTool({ name, arguments: args });

      // Check isError flag
      if ((callResult as { isError?: boolean }).isError === true) {
        toolPassed = false;
        const contentText =
          Array.isArray(callResult.content) &&
          callResult.content.length > 0 &&
          typeof (callResult.content[0] as { text?: string }).text === 'string'
            ? (callResult.content[0] as { text: string }).text
            : JSON.stringify(callResult.content);
        reason = `Tool returned isError: true — ${contentText}`;
      } else {
        // Verify output file exists and is valid JSON with at least one key
        if (!existsSync(outputPath)) {
          toolPassed = false;
          reason = `Output file not found at ${outputPath}`;
        } else {
          let parsed: unknown;
          try {
            parsed = JSON.parse(readFileSync(outputPath, 'utf8'));
          } catch (parseErr) {
            toolPassed = false;
            reason = `Output file at ${outputPath} is not valid JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
            parsed = null;
          }

          if (toolPassed) {
            if (
              parsed === null ||
              typeof parsed !== 'object' ||
              Array.isArray(parsed) ||
              Object.keys(parsed as object).length === 0
            ) {
              toolPassed = false;
              reason = `Output JSON at ${outputPath} is not an object with at least one key`;
            } else {
              reason = `Output JSON has ${Object.keys(parsed as object).length} key(s): ${Object.keys(parsed as object).join(', ')}`;
            }
          }
        }
      }
    } catch (err) {
      toolPassed = false;
      reason = `Tool call threw: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (!toolPassed) allPassed = false;

    results.push({ toolName: name, passed: toolPassed, reason });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  try {
    await client.close();
  } catch {
    // best-effort
  }
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  // ── Print summary ──────────────────────────────────────────────────────────
  console.log('\n=== git-forensics-mcp validation results ===\n');
  for (const { toolName, passed, reason } of results) {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${toolName}: ${reason}`);
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  console.log(`\n  Total: ${passCount} passed, ${failCount} failed\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
