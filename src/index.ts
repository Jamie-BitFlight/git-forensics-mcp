#!/usr/bin/env node
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

interface BranchOverviewArgs {
  repoPath: string;
  branches: string[];
  outputPath: string;
}

interface TimePeriodArgs {
  repoPath: string;
  branches: string[];
  timeRange: {
    start: string;
    end: string;
  };
  outputPath: string;
}

interface FileChangesArgs {
  repoPath: string;
  branches: string[];
  files: string[];
  outputPath: string;
}

interface MergeRecommendationsArgs {
  repoPath: string;
  branches: string[];
  outputPath: string;
}

class GitAnalysisServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'git-analysis-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_branch_overview',
          description: 'Get high-level overview of branch states and relationships',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to git repository',
              },
              branches: {
                type: 'array',
                items: { type: 'string' },
                description: 'Branches to analyze',
              },
              outputPath: {
                type: 'string',
                description: 'Path to write analysis output',
              },
            },
            required: ['repoPath', 'branches', 'outputPath'],
          },
        },
        {
          name: 'analyze_time_period',
          description: 'Analyze detailed development activity in a specific time period',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to git repository',
              },
              branches: {
                type: 'array',
                items: { type: 'string' },
                description: 'Branches to analyze',
              },
              timeRange: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                },
                required: ['start', 'end'],
              },
              outputPath: {
                type: 'string',
                description: 'Path to write analysis output',
              },
            },
            required: ['repoPath', 'branches', 'timeRange', 'outputPath'],
          },
        },
        {
          name: 'analyze_file_changes',
          description: 'Analyze changes to specific files across branches',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to git repository',
              },
              branches: {
                type: 'array',
                items: { type: 'string' },
                description: 'Branches to analyze',
              },
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files to analyze',
              },
              outputPath: {
                type: 'string',
                description: 'Path to write analysis output',
              },
            },
            required: ['repoPath', 'branches', 'files', 'outputPath'],
          },
        },
        {
          name: 'get_merge_recommendations',
          description: 'Get detailed merge strategy recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              repoPath: {
                type: 'string',
                description: 'Path to git repository',
              },
              branches: {
                type: 'array',
                items: { type: 'string' },
                description: 'Branches to analyze',
              },
              outputPath: {
                type: 'string',
                description: 'Path to write analysis output',
              },
            },
            required: ['repoPath', 'branches', 'outputPath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'get_branch_overview': {
            const args = request.params.arguments as BranchOverviewArgs;
            if (!args?.repoPath || !args?.branches || !args?.outputPath) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
            }
            return await this.handleBranchOverview(args);
          }
          case 'analyze_time_period': {
            const args = request.params.arguments as TimePeriodArgs;
            if (!args?.repoPath || !args?.branches || !args?.timeRange || !args?.outputPath) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
            }
            return await this.handleTimePeriodAnalysis(args);
          }
          case 'analyze_file_changes': {
            const args = request.params.arguments as FileChangesArgs;
            if (!args?.repoPath || !args?.branches || !args?.files || !args?.outputPath) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
            }
            return await this.handleFileChangesAnalysis(args);
          }
          case 'get_merge_recommendations': {
            const args = request.params.arguments as MergeRecommendationsArgs;
            if (!args?.repoPath || !args?.branches || !args?.outputPath) {
              throw new McpError(ErrorCode.InvalidParams, 'Missing required parameters');
            }
            return await this.handleMergeRecommendations(args);
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
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
    });
  }

  private async handleBranchOverview(args: BranchOverviewArgs) {
    const overview = args.branches.map(branch => {
      const lastCommit = this.getLastCommit(args.repoPath, branch);
      const commitCount = this.getCommitCount(args.repoPath, branch);
      const mergeBase = args.branches.map(otherBranch => {
        if (otherBranch === branch) return null;
        return {
          branch: otherBranch,
          base: this.getMergeBase(args.repoPath, branch, otherBranch),
        };
      }).filter((base): base is NonNullable<typeof base> => base !== null);

      return {
        branch,
        lastCommit,
        commitCount,
        mergeBase,
      };
    });

    const analysis = {
      overview,
      summary: this.generateOverviewSummary(overview),
    };

    writeFileSync(args.outputPath, JSON.stringify(analysis, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Branch analysis written to ${args.outputPath}`,
        },
      ],
    };
  }

  private async handleTimePeriodAnalysis(args: TimePeriodArgs) {
    const analysis = args.branches.map(branch => {
      const commits = this.getCommitsInRange(args.repoPath, branch, args.timeRange);
      return {
        branch,
        commits,
        activitySummary: this.summarizeActivity(commits),
      };
    });

    const result = {
      analysis,
      summary: this.generateTimePeriodSummary(analysis),
    };

    writeFileSync(args.outputPath, JSON.stringify(result, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Time period analysis written to ${args.outputPath}`,
        },
      ],
    };
  }

  private async handleFileChangesAnalysis(args: FileChangesArgs) {
    const analysis = args.files.map(file => {
      const changes = args.branches.map(branch => ({
        branch,
        history: this.getFileHistory(args.repoPath, branch, file),
      }));

      return {
        file,
        changes,
        conflicts: this.analyzeConflicts(changes),
      };
    });

    const result = {
      analysis,
      summary: this.generateFileChangesSummary(analysis),
    };

    writeFileSync(args.outputPath, JSON.stringify(result, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `File changes analysis written to ${args.outputPath}`,
        },
      ],
    };
  }

  private async handleMergeRecommendations(args: MergeRecommendationsArgs) {
    const recommendations = {
      strategy: this.determineMergeStrategy(args.repoPath, args.branches),
      conflictRisks: this.assessConflictRisks(args.repoPath, args.branches),
      steps: this.generateMergeSteps(args.repoPath, args.branches),
    };

    writeFileSync(args.outputPath, JSON.stringify(recommendations, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Merge recommendations written to ${args.outputPath}`,
        },
      ],
    };
  }

  private getLastCommit(repoPath: string, branch: string) {
    const output = execSync(
      `cd "${repoPath}" && git log -1 --format="%H|%aI|%s" ${branch}`,
      { encoding: 'utf8' }
    ).trim();
    const [hash, date, message] = output.split('|');
    return { hash, date, message, branch };
  }

  private getCommitCount(repoPath: string, branch: string): number {
    return parseInt(
      execSync(
        `cd "${repoPath}" && git rev-list --count ${branch}`,
        { encoding: 'utf8' }
      ).trim(),
      10
    );
  }

  private getMergeBase(repoPath: string, branch1: string, branch2: string): string {
    return execSync(
      `cd "${repoPath}" && git merge-base ${branch1} ${branch2}`,
      { encoding: 'utf8' }
    ).trim();
  }

  private getCommitsInRange(
    repoPath: string,
    branch: string,
    timeRange: { start: string; end: string }
  ) {
    const output = execSync(
      `cd "${repoPath}" && git log --format="%H|%aI|%s" ` +
      `--after="${timeRange.start}" --before="${timeRange.end}" ${branch}`,
      { encoding: 'utf8' }
    );

    return output.trim().split('\n').filter(Boolean).map(line => {
      const [hash, date, message] = line.split('|');
      return { hash, date, message, branch };
    });
  }

  private getFileHistory(repoPath: string, branch: string, file: string) {
    const output = execSync(
      `cd "${repoPath}" && git log --format="%H|%aI|%s" ${branch} -- ${file}`,
      { encoding: 'utf8' }
    );

    return output.trim().split('\n').filter(Boolean).map(line => {
      const [hash, date, message] = line.split('|');
      return { hash, date, message, branch };
    });
  }

  private summarizeActivity(commits: Array<{ hash: string; date: string; message: string; branch: string }>) {
    return {
      totalCommits: commits.length,
      firstCommit: commits[commits.length - 1],
      lastCommit: commits[0],
      commitTypes: this.categorizeCommits(commits),
    };
  }

  private categorizeCommits(commits: Array<{ message: string }>) {
    const categories = {
      feature: 0,
      fix: 0,
      refactor: 0,
      docs: 0,
      other: 0,
    };

    commits.forEach(({ message }) => {
      if (message.match(/^feat|^add/i)) categories.feature++;
      else if (message.match(/^fix|^bug/i)) categories.fix++;
      else if (message.match(/^refactor|^style|^chore/i)) categories.refactor++;
      else if (message.match(/^docs/i)) categories.docs++;
      else categories.other++;
    });

    return categories;
  }

  private analyzeConflicts(branchChanges: Array<{ branch: string; history: Array<{ hash: string; date: string; message: string }> }>) {
    const overlaps = this.findOverlappingChanges(branchChanges);
    return {
      riskLevel: this.assessRiskLevel(overlaps),
      reasons: this.generateConflictReasons(overlaps),
    };
  }

  private findOverlappingChanges(branchChanges: Array<{ branch: string; history: Array<{ date: string }> }>) {
    const timeRanges = branchChanges.map(({ branch, history }) => ({
      branch,
      start: history[history.length - 1]?.date,
      end: history[0]?.date,
    }));

    return timeRanges.flatMap((range1, i) => 
      timeRanges.slice(i + 1).map(range2 => ({
        branches: [range1.branch, range2.branch],
        overlaps: this.datesOverlap(
          new Date(range1.start),
          new Date(range1.end),
          new Date(range2.start),
          new Date(range2.end)
        ),
      }))
    ).filter(({ overlaps }) => overlaps);
  }

  private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  private assessRiskLevel(overlaps: Array<{ branches: string[] }>) {
    if (overlaps.length === 0) return 'low';
    if (overlaps.length <= 2) return 'medium';
    return 'high';
  }

  private generateConflictReasons(overlaps: Array<{ branches: string[] }>) {
    return overlaps.map(({ branches }) => 
      `Parallel development detected between ${branches.join(' and ')}`
    );
  }

  private determineMergeStrategy(repoPath: string, branches: string[]) {
    const commitCounts = branches.map(branch => ({
      branch,
      count: this.getCommitCount(repoPath, branch),
    }));

    const baseChoice = commitCounts.reduce((a, b) => 
      a.count > b.count ? a : b
    );

    return {
      recommendedBase: baseChoice.branch,
      approach: 'cherry-pick',
      reasoning: [
        `${baseChoice.branch} has the most changes (${baseChoice.count} commits)`,
        'Cherry-pick approach allows for selective integration',
      ],
    };
  }

  private assessConflictRisks(repoPath: string, branches: string[]) {
    const changedFiles = new Map<string, string[]>();

    branches.forEach(branch => {
      const files = execSync(
        `cd "${repoPath}" && git diff --name-only $(git merge-base ${branches[0]} ${branch})..${branch}`,
        { encoding: 'utf8' }
      )
        .trim()
        .split('\n')
        .filter(Boolean);

      files.forEach(file => {
        const current = changedFiles.get(file) || [];
        changedFiles.set(file, [...current, branch]);
      });
    });

    const hotspots = Array.from(changedFiles.entries())
      .filter(([_, branches]) => branches.length > 1)
      .map(([file]) => file);

    return {
      overallRisk: hotspots.length > 5 ? 'high' : hotspots.length > 0 ? 'medium' : 'low',
      hotspots,
      recommendations: [
        'Review changes in hotspots first',
        'Consider creating integration tests for modified components',
      ],
    };
  }

  private generateMergeSteps(repoPath: string, branches: string[]) {
    return [
      'Create backup branches',
      'Create integration branch from recommended base',
      'Cherry-pick non-conflicting changes',
      'Resolve conflicts in hotspots',
      'Run test suite after each significant change',
      'Verify functionality of modified components',
      'Update documentation to reflect changes',
    ];
  }

  private generateOverviewSummary(overview: Array<{ branch: string; commitCount: number }>) {
    const totalCommits = overview.reduce((sum, { commitCount }) => sum + commitCount, 0);
    const avgCommits = totalCommits / overview.length;

    return {
      totalBranches: overview.length,
      totalCommits,
      averageCommitsPerBranch: Math.round(avgCommits),
      mostActiveBranch: overview.reduce((a, b) => 
        a.commitCount > b.commitCount ? a : b
      ).branch,
    };
  }

  private generateTimePeriodSummary(
    analysis: Array<{
      branch: string;
      commits: Array<{ message: string }>;
      activitySummary: { totalCommits: number };
    }>
  ) {
    const totalCommits = analysis.reduce(
      (sum, { activitySummary }) => sum + activitySummary.totalCommits,
      0
    );

    return {
      totalCommits,
      branchesWithActivity: analysis.filter(
        ({ activitySummary }) => activitySummary.totalCommits > 0
      ).length,
      mostActiveBy: {
        commits: analysis.reduce((a, b) =>
          a.activitySummary.totalCommits > b.activitySummary.totalCommits ? a : b
        ).branch,
      },
    };
  }

  private generateFileChangesSummary(
    analysis: Array<{
      file: string;
      changes: Array<{ branch: string; history: Array<unknown> }>;
      conflicts: { riskLevel: string };
    }>
  ) {
    const riskLevels = analysis.map(({ conflicts }) => conflicts.riskLevel);
    
    return {
      totalFiles: analysis.length,
      filesWithConflicts: riskLevels.filter(level => level !== 'low').length,
      highRiskFiles: riskLevels.filter(level => level === 'high').length,
      recommendedReviewOrder: analysis
        .sort((a, b) => this.riskToNumber(b.conflicts.riskLevel) - this.riskToNumber(a.conflicts.riskLevel))
        .map(({ file }) => file),
    };
  }

  private riskToNumber(risk: string): number {
    switch (risk) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Git Analysis MCP server running on stdio');
  }
}

const server = new GitAnalysisServer();
server.run().catch(console.error);