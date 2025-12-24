---
title: Git Worktree Dev Server and Database Seeding Issues
category: dev-environment
tags:
  - git-worktrees
  - django
  - database-seeding
  - dev-server
  - port-management
  - playwright
symptoms:
  - Dev server shows build errors or wrong code version
  - Database seeding completes but users don't exist
  - "Invalid field name(s) for model User: 'status'" error
  - Playwright tests fail with auth timeout
  - Screenshots show wrong/old UI state
severity: medium
date_solved: 2024-12-24
---

# Git Worktree Dev Server and Database Seeding Issues

## Problem Summary

When working in a git worktree, several interconnected issues can cause the development environment to behave unexpectedly:

1. Dev server runs from main repo instead of worktree
2. Database seeding fails due to model field mismatches
3. Environment variables not loading correctly
4. Port detection hardcoded, not supporting multiple worktrees

## Symptoms

### Dev Server Shows Wrong Code

```
# Screenshot shows build errors or old UI
# Code changes in worktree not reflected
```

### Database Seeding "Works" But Data Missing

```bash
# Seed command shows success
python manage.py seed_data --mode demo
# Output: "Seeding completed successfully!"

# But psql shows no users
psql -U plane -d plane -c "SELECT email FROM users;"
# (0 rows)
```

### Invalid Field Error on User Model

```
CommandError: Invalid field name(s) for model User: 'status'.
```

## Root Causes

### 1. Dev Server Running from Wrong Directory

When `pnpm dev:all` is started via background process or shell automation, it may inherit the working directory of the parent process (main repo) rather than the worktree.

**Detection:**

```bash
# Check what directory the dev server is running from
ps aux | grep "pnpm dev" | grep -v grep
# Look for path in output - should match your worktree
```

### 2. seed_data.py Using Invalid Model Field

The `seed_data.py` command was setting a `status` field that doesn't exist on the User model:

```python
# WRONG - 'status' field doesn't exist on User model
user, created = User.objects.get_or_create(
    email=email,
    defaults={
        "username": email,
        "is_active": True,
        "status": "active",  # <-- This field doesn't exist!
    },
)
```

### 3. Environment Variables Not Expanding

The `.env` file uses variable expansion:

```bash
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
```

Simply `source .env` doesn't expand these. Django may connect to wrong database.

### 4. Hardcoded Port 3000

Skills/scripts that hardcode port 3000 fail when worktrees use dynamic port allocation.

## Solutions

### Fix 1: Start Dev Server from Correct Directory

Always `cd` to the worktree explicitly:

```bash
cd /path/to/repo/.worktrees/my-feature && pnpm dev:all
```

Or kill existing servers first:

```bash
pkill -f "pnpm dev:all"
pkill -f "react-router dev"
cd /correct/worktree/path && pnpm dev:all
```

### Fix 2: Remove Invalid Field from seed_data.py

```python
# CORRECT - only use fields that exist on User model
user, created = User.objects.get_or_create(
    email=email,
    defaults={
        "username": email,
        "first_name": "Test",
        "last_name": "User",
        "is_active": True,
        "is_email_verified": True,
        "is_password_autoset": False,
        # NO 'status' field
    },
)
```

### Fix 3: Properly Load Environment Variables

Use `set -a` to export all variables:

```bash
source venv/bin/activate
set -a && source .env && set +a
python manage.py seed_data --mode demo
```

Or for one-liners:

```bash
cd apps/api && source venv/bin/activate && set -a && source .env && set +a && python manage.py seed_data --mode demo
```

### Fix 4: Dynamic Port Detection

Check for `.dev-ports` file which tracks allocated ports:

```bash
# Check for port config file
DEV_PORTS_FILE="$(git rev-parse --show-toplevel 2>/dev/null)/.dev-ports"
if [ -f "$DEV_PORTS_FILE" ]; then
    source "$DEV_PORTS_FILE"
    echo "Using WEB_PORT=$WEB_PORT"
fi

# If in worktree, also check main repo
if [ -z "$WEB_PORT" ]; then
    MAIN_REPO=$(git rev-parse --git-common-dir 2>/dev/null | sed 's/\.git$//')
    if [ -f "${MAIN_REPO}/.dev-ports" ]; then
        source "${MAIN_REPO}/.dev-ports"
    fi
fi

# Default fallback
WEB_PORT=${WEB_PORT:-3000}
```

## Verification

### Verify Correct Dev Server

```bash
# Check port is responding with expected content
curl -s http://localhost:$WEB_PORT | head -20

# Should show HTML from your worktree's code
```

### Verify Database Seeding

```bash
psql -U plane -d plane -c "SELECT email, is_active FROM users WHERE email = 'admin@admin.gov';"
# Should show:
#       email      | is_active
# -----------------+-----------
#  admin@admin.gov | t
```

### Verify Environment Variables

```bash
source venv/bin/activate && set -a && source .env && set +a && python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.local')
import django
django.setup()
from django.conf import settings
print(f'DB: {settings.DATABASES[\"default\"][\"NAME\"]}')
print(f'HOST: {settings.DATABASES[\"default\"][\"HOST\"]}')
"
# Should show: DB: plane, HOST: localhost
```

## Prevention

1. **Always verify working directory** before starting dev server in worktrees
2. **Test seed_data.py changes** by running `python manage.py check` before seeding
3. **Use `.dev-ports` file** for port detection instead of hardcoding
4. **Load env properly** with `set -a && source .env && set +a`

## Related

- CLAUDE.md section on "Running Locally"
- `.dev-ports` file created by `scripts/dev.sh`
- `apps/api/plane/db/management/commands/seed_data.py`
