# External Integrations

**Analysis Date:** 2026-02-07

## Git Integration

**Local Git:**
- Git is invoked via Node.js `execSync()` in `src/index.ts`
- All git operations are local (repository analysis only)
- Pattern: `execSync(\`cd "${repoPath}" && git ...\`, {encoding: 'utf8'})`
- Operations include:
  - `git log` - Commit history analysis
  - `git rev-list --count` - Commit counting
  - `git merge-base` - Common ancestor detection
  - `git diff` - File change analysis

## APIs & External Services

**npm Registry:**
- Package: @jamie-bitflight/git-forensics-mcp
- Published via GitHub Actions workflow (`.github/workflows/publish.yml`)
- Registry URL: https://registry.npmjs.org
- Provenance: NPM_CONFIG_PROVENANCE enabled (attestations via SLSA)

**GitHub API:**
- Release creation: GitHub Release API integration
- Used via Nx Release with `createRelease: "github"` (see `nx.json`)
- Triggered by: GitHub Actions release event (`.github/workflows/publish.yml`)
- Permissions: write access to releases

## Authentication & Secrets

**GitHub:**
- Token: GH_RELEASE_TOKEN (used in `.github/workflows/release.yml`)
  - Used for: checkout with full history, Nx release operations
  - Environment variable: `${{ secrets.GH_RELEASE_TOKEN }}`

**npm:**
- Token: NPM_TOKEN (used in `.github/workflows/publish.yml`)
  - Registry URL configured in action: https://registry.npmjs.org
  - Provenance enabled: Node OIDC token exchange
  - Environment variable: `${{ secrets.NPM_TOKEN }}`

## CI/CD & Deployment

**Hosting/Distribution:**
- npm Public Registry - Primary distribution channel
- Package scope: @jamie-bitflight (public)
- Published as: @jamie-bitflight/git-forensics-mcp

**CI Pipeline:**
- GitHub Actions - Orchestration platform
- Workflows:
  - `.github/workflows/release.yml` - Version bumping and tagging
  - `.github/workflows/publish.yml` - npm publication
  - `.github/workflows/claude.yml` - (present but not documented in CLAUDE.md)
  - `.github/workflows/claude-code-review.yml` - (present but not documented in CLAUDE.md)

**Release Process:**
1. Push to `main` branch triggers `.github/workflows/release.yml`
2. Nx Release determines version (conventional commits)
3. Git tags created
4. Release event triggers `.github/workflows/publish.yml`
5. TypeScript build compiled
6. pnpm publishes to npm registry
7. GitHub Release created automatically

**Build Environment (GitHub Actions):**
- Runner: ubuntu-latest
- Node.js: 20.x
- pnpm: 9.x
- Cache: pnpm dependencies

## Webhooks & Callbacks

**Incoming:**
- GitHub webhooks on release creation trigger `.github/workflows/publish.yml`

**Outgoing:**
- npm registry notifications (implicit via pnpm publish)

## Scanning & Monitoring

**Gitleaks (Pre-commit):**
- Secret scanning via Docker container: `zricethezav/gitleaks:latest`
- Runs in pre-commit hook: `.husky/pre-commit`
- Scans staged files only: `docker run ... protect --source='/path' --staged`
- Optional: skips gracefully if Docker unavailable
- Command: `echo "Docker not found, skipping gitleaks scan"`

**Nx Cloud:**
- Optional cloud integration configured in `nx.json`
- nxCloudId: 68f24bee9c26fa57d50d4ecc

## Data Storage

**Databases:**
- Not used - Analysis tool operates on git repository data only

**File Storage:**
- Local filesystem only
- Output written to caller-specified paths via `outputPath` parameter
- Output format: JSON files written via `writeFileSync()`
- No cloud storage integration

**Caching:**
- GitHub Actions: pnpm cache (node_modules)
- No external caching service

## No External Integrations

**Missing/Not Used:**
- No database (SQLite, PostgreSQL, MongoDB, etc.)
- No external authentication provider (Auth0, Okta, etc.)
- No third-party API integrations
- No message queues (Redis, RabbitMQ, etc.)
- No analytics or observability platforms
- No container registry (Docker Hub, ECR, etc.)
- No logging aggregation service
- No CDN or external caching

---

*Integration audit: 2026-02-07*
