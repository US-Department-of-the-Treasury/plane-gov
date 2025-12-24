# Database Seed Troubleshooting Skill

Diagnose and fix database seeding issues in Django development environments.

## When to Use

Run this skill when:

- `seed_data` command reports success but users don't exist
- "Invalid field name(s) for model" errors appear
- Playwright auth fails with "Create account" button disabled
- Database appears empty after seeding

## Common Issues

### 1. Environment Variables Not Expanding

The `.env` file uses variable expansion that `source` alone doesn't handle:

```bash
# WRONG - variables don't expand
source .env
python manage.py seed_data

# CORRECT - export all variables with expansion
set -a && source .env && set +a
python manage.py seed_data
```

### 2. Wrong Database Connection

Django may connect to SQLite or wrong PostgreSQL database if env vars aren't loaded.

### 3. Invalid Model Fields

`seed_data.py` may reference fields that don't exist on the model (e.g., `status` on User).

## Execution

```bash
# Navigate to API directory
cd apps/api

# Activate virtual environment
source venv/bin/activate

# Load environment variables PROPERLY
set -a && source .env && set +a

# Verify database connection
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'plane.settings.local')
import django
django.setup()
from django.conf import settings
db = settings.DATABASES['default']
print(f'Database: {db[\"NAME\"]}')
print(f'Host: {db[\"HOST\"]}')
print(f'Port: {db[\"PORT\"]}')
"

# Run model validation first
python manage.py check

# Then seed
python manage.py seed_data --mode demo --force
```

## Verification

```bash
# Verify user was created
psql -U plane -d plane -c "SELECT email, is_active FROM users WHERE email = 'admin@admin.gov';"

# Expected output:
#       email      | is_active
# -----------------+-----------
#  admin@admin.gov | t
```

## One-Liner for Quick Seeding

```bash
cd apps/api && source venv/bin/activate && set -a && source .env && set +a && python manage.py seed_data --mode demo --force
```

## Troubleshooting Table

| Symptom                     | Cause                      | Fix                                     |
| --------------------------- | -------------------------- | --------------------------------------- |
| "Invalid field name 'X'"    | Model doesn't have field X | Remove field from seed_data.py defaults |
| Seed succeeds, no users     | Wrong database connection  | Use `set -a && source .env && set +a`   |
| "relation does not exist"   | Migrations not run         | `python manage.py migrate`              |
| User exists but can't login | Password not set           | Check `user.set_password()` is called   |

## Related

- `apps/api/plane/db/management/commands/seed_data.py`
- `scripts/db-reset.sh`
- `docs/solutions/dev-environment/worktree-dev-server-and-seeding-issues.md`
