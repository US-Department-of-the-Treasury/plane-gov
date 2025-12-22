# Contributing to Treasury Plane

Thank you for your interest in contributing to the Treasury fork of Plane. This guide covers how to set up your development environment and submit contributions.

## Contribution Terms

This project is licensed under AGPL-3.0. By contributing, you agree to the following:

**Federal Employees:** Contributions made as part of official duties are not subject to U.S. copyright (17 U.S.C. § 105) but become part of this AGPL-3.0 licensed project.

**Non-Federal Contributors:** By submitting a pull request, you agree to license your contribution under the AGPL-3.0 license and certify that you have the right to do so.

See the [NOTICE](./NOTICE) file for more details on licensing.

## Submitting Issues

Before submitting a new issue, please search existing [issues](https://github.com/US-Department-of-the-Treasury/plane-treasury/issues) to avoid duplicates.

When creating an issue, please provide:

- Clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (browser, OS, etc.)

## Development Setup

### Requirements

- Node.js 22+ (see `engines` in package.json)
- Python 3.12+
- PostgreSQL 14+ (running)
- Redis 6.2+ (running)
- pnpm (package manager)

**macOS quick install:**

```bash
brew install node@22 python@3.12 postgresql@14 redis pnpm
brew services start postgresql@14
brew services start redis
```

### Quick Start (Recommended)

The easiest way to start all services:

```bash
git clone https://github.com/US-Department-of-the-Treasury/plane-treasury.git
cd plane-treasury
pnpm install
./scripts/setup-security.sh  # One-time: install gitleaks
./scripts/dev.sh             # Starts all services
```

This script:

- Checks all prerequisites
- Builds internal packages
- Starts Django API server
- Starts all frontend services
- Shows all URLs when ready

### Manual Setup

If you prefer to set up manually:

1. Clone and install:

```bash
git clone https://github.com/US-Department-of-the-Treasury/plane-treasury.git
cd plane-treasury
pnpm install
./scripts/setup-security.sh
```

2. Set up Python environment:

```bash
cd apps/api
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Configure environment:

```bash
# From project root
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your local settings (database, redis, etc.)
```

4. Create database and run migrations:

```bash
createdb plane  # or: psql -c "CREATE DATABASE plane;"
cd apps/api
source venv/bin/activate
set -a && source .env && set +a
python manage.py migrate
```

5. Start the servers:

**Option A - All services (recommended):**

```bash
pnpm dev:all  # Runs scripts/dev.sh
```

**Option B - Separate terminals:**

```bash
# Terminal 1: API server
cd apps/api && source venv/bin/activate
set -a && source .env && set +a
python manage.py runserver 8000

# Terminal 2: Frontend services
pnpm dev:build  # Builds packages first, then starts dev servers
```

### Services & Ports

| Service | URL                             | Description             |
| ------- | ------------------------------- | ----------------------- |
| Web App | http://localhost:3000           | Main application        |
| Admin   | http://localhost:3001/god-mode/ | Instance administration |
| Space   | http://localhost:3002           | Public project sharing  |
| Live    | http://localhost:3100           | Real-time collaboration |
| API     | http://localhost:8000           | Django REST API         |

### Troubleshooting

**"Failed to resolve entry for package @plane/utils"**

The internal packages need to be built first. Run:

```bash
pnpm turbo run build --filter="@plane/*"
pnpm dev
```

Or use `pnpm dev:build` which does this automatically.

**API server fails with Redis/Database errors**

Ensure PostgreSQL and Redis are running:

```bash
brew services list  # Check status
brew services start postgresql@14
brew services start redis
```

**Environment variables not loading**

The Django app requires environment variables. Load them before running:

```bash
cd apps/api
source venv/bin/activate
set -a && source .env && set +a
python manage.py runserver
```

## Code Guidelines

### General

- Write clear, self-documenting code
- Follow existing patterns in the codebase
- Keep changes focused and minimal

### Frontend (TypeScript/React)

- We use ESLint and Prettier for code formatting
- Run `pnpm check:lint` before committing
- Run `pnpm check:types` to verify TypeScript

### Backend (Python/Django)

- Follow PEP 8 style guidelines
- Add type hints where practical
- Write tests for new functionality

### Testing Requirements

**Before submitting a PR:**

1. **Install Playwright browsers** (one-time):

   ```bash
   pnpm exec playwright install chromium
   ```

2. **Run smoke tests** to verify no regressions:

   ```bash
   pnpm test:smoke
   ```

3. **For significant changes, run full E2E tests:**
   ```bash
   pnpm test:e2e
   ```

**Expected result:** All tests should pass with zero console errors.

If tests fail:

- Fix the root cause (preferred)
- Update tests if behavior intentionally changed
- Document known issues in PR description

See [apps/web/TESTING.md](./apps/web/TESTING.md) for detailed testing guide.

## Pull Requests

1. Create a feature branch from `preview`:

```bash
git checkout preview
git pull origin preview
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:

```bash
git add .
git commit -m "feat: description of change"
```

3. Push and create a PR:

```bash
git push origin feature/your-feature-name
```

4. Fill out the PR template with:

- Summary of changes
- Test plan
- Any breaking changes

## Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Questions

For questions about contributing, open a GitHub issue with the `question` label.
