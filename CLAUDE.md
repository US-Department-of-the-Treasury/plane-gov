# Plane for Government

This is the US Department of the Treasury fork of Plane, available for use by any U.S. government agency.

## Repository Information

- **Upstream**: `makeplane/plane`
- **Fork**: `US-Department-of-the-Treasury/plane-gov`
- **Primary Branch**: `master`

## Critical Rules

### Pull Requests

**ALWAYS create PRs against the government fork, not upstream:**

```bash
# CORRECT - creates PR against government fork
gh pr create --repo US-Department-of-the-Treasury/plane-gov

# WRONG - would create PR against upstream makeplane/plane
gh pr create  # DO NOT USE without --repo flag
```

### Security Requirements

This fork has been hardened for government deployment. **Do not reintroduce:**

- Sentry error reporting
- PostHog analytics
- Microsoft Clarity session recording
- External CDN dependencies (jsdelivr, unpkg)
- Unsplash or other third-party image APIs
- Any automatic external network calls

Run `/gov-security-audit` before merging any changes that add dependencies or external integrations.

### Syncing from Upstream

When syncing from upstream `makeplane/plane`:

1. Create a new branch from `master`
2. Merge upstream changes
3. Run `/gov-security-audit` to detect new external calls
4. Remove any newly introduced telemetry/analytics
5. Test thoroughly before merging

## Fork Differences

See `GOVERNMENT.md` for complete documentation of differences from upstream.

Key changes:

- Sentry removed (stubbed in entry points)
- PostHog removed completely
- Microsoft Clarity removed
- Unsplash integration removed
- External CDN URLs removed
- OIDC authentication added for Login.gov

## Development

### Running Locally

**ALWAYS use `pnpm dev` to start development.** This starts ALL required services with automatic port allocation:

```bash
# Prerequisites (must be running first)
brew services start postgresql@14
brew services start redis

# Start ALL services (ALWAYS use this)
pnpm dev
```

**Multiple Worktrees:** Ports are automatically allocated to avoid conflicts when running multiple worktrees:

- First worktree: 3000, 3001, 3002, 3100, 8000
- Second worktree: 3010, 3011, 3012, 3110, 8010
- And so on...

Override with `PORT_OFFSET=2 pnpm dev` if needed. The `.dev-ports` file tracks allocated ports per worktree.

### Stopping Dev Servers

**CRITICAL: Only kill dev servers for the CURRENT worktree. NEVER use broad `pkill` commands.**

```bash
# CORRECT - kills only this worktree's servers (safe)
./scripts/dev.sh --kill

# ALSO SAFE - list all running servers first
./scripts/dev.sh --list

# WRONG - kills ALL dev servers across ALL worktrees
# pkill -f "pnpm.*dev"   # DO NOT USE
# pkill -f "node.*turbo" # DO NOT USE
```

The `--kill` flag reads the `.dev-ports` file to find the exact ports allocated to this worktree and only kills processes on those ports.

### Running E2E Tests

**ALWAYS use root-level test commands** - they handle starting all services automatically:

```bash
# Run all E2E tests (starts API + frontend automatically)
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Open Playwright UI for debugging
pnpm test:e2e:ui

# Quick smoke tests only
pnpm test:smoke
```

**Smart server handling:** Tests automatically detect running dev servers and reuse them for faster test runs. If no servers are running, tests start their own (and clean up after).

**Database seeding:** Tests automatically seed the database on first run (or when auth state expires after 24h). To skip seeding if you already have data: `E2E_SKIP_SEED=1 pnpm test:e2e`

**Test credentials:** `admin@admin.gov` / `admin123` (automatically used by Playwright)

**Running tests from `apps/web` directly:** Only do this if you have `pnpm dev` running in the same worktree. The root commands handle everything automatically.

### Seed Data & Database Reset

Use `./scripts/db-reset.sh` to wipe and re-seed the database with test data:

```bash
./scripts/db-reset.sh           # Reset with demo data
./scripts/db-reset.sh --mode=random --issues=100  # Generate random data
```

**IMPORTANT: When creating migrations or new data types, update the seed scripts:**

1. **New model fields** - Add to `apps/api/plane/seeds/data/*.json` demo files
2. **New entity types** - Update `apps/api/plane/db/management/commands/seed_data.py`
3. **Renamed fields** - Create a migration and verify seed_data still works

Test credentials after reset: `admin@admin.gov` / `admin123`

### Other Commands

```bash
# Setup
pnpm install

# Type checking
pnpm check:types

# Linting
pnpm check:lint

# Security audit before committing
# Run the gov-security-audit skill
```

### Deployment

**Use `/workflows:deploy`** for all deployments. Config is cached in `.claude/deploy-config.json`. Infrastructure is Terraform-managed in `terraform/`. See `terraform/DEPLOYMENT.md` for manual steps.

## Related Documentation

- `GOVERNMENT.md` - Fork setup and configuration
- `FORK-DIFFERENCES.md` - Tracking divergence from upstream
- `docs/solutions/security-issues/` - Security hardening documentation
- `terraform/DEPLOYMENT.md` - Infrastructure deployment guide
