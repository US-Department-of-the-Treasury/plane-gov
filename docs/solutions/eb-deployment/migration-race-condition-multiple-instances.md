---
problem_type: deployment-race-condition
component: aws-elastic-beanstalk-django
symptoms:
  - "Command 01_migrate failed on one instance during EB deployment"
  - "One instance Red health, one instance Green health after deployment"
  - "Both instances attempted to run migrations simultaneously"
  - "Environment goes to Degraded health with 50% instances unhealthy"
  - "Error: migrations already applied by another instance"
severity: high
tags:
  - elastic-beanstalk
  - django-migrations
  - leader-only
  - race-condition
  - multi-instance
  - deployment-failures
related_components:
  - aws-elastic-beanstalk
  - django-migrations
  - container-commands
  - rds-postgresql
date_solved: 2025-12-24
---

# Elastic Beanstalk Django Migration Race Condition (Multiple Instances)

## Problem

When deploying Django applications to Elastic Beanstalk with multiple instances (e.g., 2 or more EC2 instances), both instances attempt to run database migrations simultaneously during deployment. This causes a race condition where:

- **Instance 1** starts running migrations
- **Instance 2** starts running migrations at the same time
- One succeeds, the other fails with "migrations already applied"
- Failed instance goes to Red health status
- Environment becomes Degraded with partial deployment failure

## Symptoms

### Error from EB Logs

```
2025/12/24 16:44:54.832590 [INFO] Error occurred during build: Command 01_migrate failed
```

### cfn-init.log

```
2025-12-24 16:44:54,796 [ERROR] Command 01_migrate (source /opt/elasticbeanstalk/deployment/custom_env && /var/app/venv/*/bin/python manage.py migrate --noinput) failed
```

### Environment Health

- **Instance 1**: Red health, migration failed
- **Instance 2**: Green health, no migration errors (or vice versa)
- **Overall Environment**: Degraded or Severe

### Common Error Messages

You may see one of these in the failed instance logs:

```
django.db.utils.ProgrammingError: relation "plane_workspace" already exists
```

or

```
django.db.migrations.exceptions.InconsistentMigrationHistory: Migration plane.0121_shadowuser is applied before its dependency plane.0120_previous on database 'default'
```

or

```
CommandError: Conflicting migrations detected; multiple leaf nodes in the migration graph
```

## CRITICAL: Troubleshooting Before Assuming Race Condition

**STOP. Before assuming a migration failure is due to race conditions, ALWAYS check the actual error logs.**

Many migration failures look similar at first glance but have completely different root causes:

| Error Type                    | Symptom                                     | Actual Cause                                      |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Race condition                | "relation already exists" on BOTH instances | Two instances ran migrations simultaneously       |
| Duplicate object in migration | "relation already exists" on ONE instance   | Migration file creates object that already exists |
| Migration dependency issue    | "dependency not applied"                    | Migration ordering problem                        |
| Timeout                       | Command timed out                           | Migration takes too long                          |

### How to Diagnose: Get the ACTUAL Error

```bash
# 1. Download logs from the failed instance
./scripts/fetch-eb-logs.sh download

# 2. Check the cfn-init-cmd.log for the actual migration error
grep -A 20 "01_run_migrations" /tmp/eb-logs-latest/var/log/cfn-init-cmd.log

# 3. Look for specific PostgreSQL error
grep -i "error\|exception\|failed" /tmp/eb-logs-latest/var/log/cfn-init-cmd.log
```

### Common Misdiagnosis: DuplicateTable vs Race Condition

**Scenario:** Migration fails with `relation "some_index" already exists`

**Wrong assumption:** "Must be a race condition - two instances ran simultaneously"

**Correct investigation:**

```bash
# Check if the object is created in multiple migrations
grep -r "some_index" apps/api/plane/db/migrations/
```

**If the same index/table appears in multiple migration files, that's a BUG in the migration code, NOT a race condition.**

**Example from December 24, 2025:**

```
psycopg.errors.DuplicateTable: relation "wikipage_search_idx" already exists
```

Investigation revealed:

- `wikipage_search_idx` was created in `0119_wiki_tables.py`
- `wikipage_search_idx` was ALSO created in `0121_add_user_status_fields.py`
- This was a migration bug, not a race condition
- Fix: Remove duplicate `AddIndex` from migration 0121

### Pre-Deployment Migration Validation

Before deploying migrations to production, run this check:

```bash
# Check for duplicate object names across migrations
cd apps/api
grep -h "name='" plane/db/migrations/*.py | \
  sed "s/.*name='\\([^']*\\)'.*/\\1/" | \
  sort | uniq -d

# If any output appears, those objects are defined multiple times!
```

## Root Cause Analysis

### Why This Happens

Elastic Beanstalk runs `container_commands` from `.ebextensions` on **all instances simultaneously** during deployment. If you have a migration command configured like this:

```yaml
# .ebextensions/03-django.config
container_commands:
  01_migrate:
    command: "source /opt/elasticbeanstalk/deployment/custom_env && /var/app/venv/*/bin/python manage.py migrate --noinput"
    # MISSING: leader_only: true
```

**What happens:**

1. EB deployment starts on all instances in parallel
2. Both instances reach the `container_commands` phase
3. **Instance A** executes `python manage.py migrate`
4. **Instance B** executes `python manage.py migrate` (at the same time!)
5. Instance A acquires database lock, starts applying migration 0121
6. Instance B tries to acquire lock, waits or proceeds based on Django's migration locking
7. Instance A completes migration 0121, commits transaction
8. Instance B sees migration 0121 already applied, throws error
9. Instance B's deployment fails, goes to Red health

### Django Migration Locking

Django uses database-level advisory locks during migrations (via `django_migrations` table). However:

- If both instances start at exactly the same time, both may read the migrations table before either writes
- Depending on PostgreSQL isolation level and Django version, one may proceed while the other fails
- Even with locking, the failed instance will report an error to EB, causing Red health

### When This Was Discovered

This issue was encountered on **December 24, 2025** while deploying the `shadow-user-invitations` branch which included:

- Migration `0121_shadowuser` (new model for PIV-authenticated shadow users)
- Migration `0122_update_invitation_permissions` (add shadow user invitation logic)

The deployment had to be re-run after the failure since one instance was healthy but the environment was degraded.

## Solution

### Use `leader_only: true` for Migrations

Add the `leader_only: true` flag to ensure migrations run on **only one instance** (the leader).

**Correct Configuration:**

```yaml
# apps/api/.ebextensions/03-django.config or 05-django-init.config
container_commands:
  01_migrate:
    command: "source /opt/elasticbeanstalk/deployment/custom_env && /var/app/venv/*/bin/python manage.py migrate --noinput"
    leader_only: true # CRITICAL: Only run on leader instance
```

### How `leader_only` Works

When `leader_only: true` is set:

1. Elastic Beanstalk designates one instance as the "leader" (usually the first alphabetically by instance ID)
2. Only the leader instance executes the container command
3. Other instances skip the command entirely
4. Leader instance completes migration successfully
5. All instances proceed to the next phase once leader finishes

**Verification:**

```bash
# After deployment, check which instance was leader
aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[*].{InstanceId:InstanceId,Deployment:Deployment}' \
  --output table

# Leader will show "Deployment: Leader" during deployment phase
```

### Complete Example Configuration

**Full `.ebextensions/05-django-init.config` with leader-only migrations:**

```yaml
# apps/api/.ebextensions/05-django-init.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: plane.settings.production
    PYTHONPATH: /var/app/current

container_commands:
  01_migrate:
    command: |
      #!/bin/bash
      set -e
      cd /var/app/staging
      source /var/app/venv/staging-*/bin/activate
      source /opt/elasticbeanstalk/deployment/custom_env

      echo "Starting database migrations..."
      python manage.py migrate --noinput
      echo "Migrations completed successfully"
    leader_only: true
    timeout: 600 # 10 minutes (adjust if migrations are slow)

  02_collectstatic:
    command: |
      #!/bin/bash
      set -e
      cd /var/app/staging
      source /var/app/venv/staging-*/bin/activate
      source /opt/elasticbeanstalk/deployment/custom_env

      echo "Collecting static files..."
      python manage.py collectstatic --noinput
      echo "Static files collected"
    leader_only: true # Optional: only need to run once

  03_create_superuser:
    command: |
      #!/bin/bash
      cd /var/app/staging
      source /var/app/venv/staging-*/bin/activate
      source /opt/elasticbeanstalk/deployment/custom_env

      # Only create if DJANGO_SUPERUSER_PASSWORD is set
      if [ ! -z "$DJANGO_SUPERUSER_PASSWORD" ]; then
        python manage.py createsuperuser --noinput --email admin@admin.gov || true
      fi
    leader_only: true # Only create superuser once
```

### Additional Safety Patterns

#### 1. Add Migration Logging

Log migration output to a file for debugging:

```yaml
container_commands:
  01_migrate:
    command: |
      #!/bin/bash
      set -e
      cd /var/app/staging
      source /var/app/venv/staging-*/bin/activate
      source /opt/elasticbeanstalk/deployment/custom_env

      # Log to file and stdout
      exec > >(tee -a /var/log/migrations.log)
      exec 2>&1

      echo "[$(date)] Starting migrations on instance $(ec2-metadata --instance-id | cut -d ' ' -f 2)"
      python manage.py migrate --noinput --verbosity 2
      echo "[$(date)] Migrations completed"
    leader_only: true
    timeout: 600
```

#### 2. Pre-Deployment Migration Check

Before deploying, verify migration plan locally:

```bash
# From apps/api directory
cd apps/api
source venv/bin/activate

# Check what migrations will run
python manage.py showmigrations

# Show migration plan
python manage.py migrate --plan

# Check for conflicts
python manage.py makemigrations --check --dry-run
```

#### 3. Test Migrations Against Production-Like Data

Create a production database dump and test migrations locally:

```bash
# Dump production database (sanitized)
pg_dump $PROD_DB_URL > prod_dump.sql

# Load into local database
psql $LOCAL_DB_URL < prod_dump.sql

# Run migrations locally
cd apps/api
python manage.py migrate

# Time the migration
time python manage.py migrate
# If > 5 minutes, increase timeout in .ebextensions
```

#### 4. Use Rolling Deployment Policy (Production)

For production environments, use rolling deployments to minimize impact:

```terraform
# terraform/eb-environment.tf
resource "aws_elastic_beanstalk_environment" "prod" {
  # ...

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"  # Deploy to instances in batches
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "50"  # Deploy to 50% of instances at a time
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "Timeout"
    value     = "600"  # 10 minutes per batch
  }
}
```

**Why this helps:**

- Migrations run on first batch (leader is in first batch)
- If migration fails, deployment aborts before touching remaining instances
- Easier rollback without full environment degradation
- Reduces blast radius of failed deployments

## Prevention Strategies

### Pre-Deployment Checklist

Before deploying any code with database migrations:

- [ ] Verify `leader_only: true` is set for migration commands in `.ebextensions`
- [ ] Test migrations locally: `python manage.py migrate --plan`
- [ ] Check migration duration: `time python manage.py migrate`
- [ ] If migration takes > 5 minutes, increase timeout in `.ebextensions`
- [ ] Review migration code for potential deadlocks or long-running queries
- [ ] Ensure migrations are idempotent (safe to run multiple times)
- [ ] Check for conflicting migrations: `python manage.py showmigrations`
- [ ] Test against production-like dataset if possible

### Post-Deployment Verification

After deployment completes:

```bash
# 1. Check environment health
aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query 'Environments[0].{Status:Status,Health:Health,HealthStatus:HealthStatus}' \
  --output table

# 2. Check instance health (should all be Green)
aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --attribute-names All \
  --query 'InstanceHealthList[*].{InstanceId:InstanceId,HealthStatus:HealthStatus,Deployment:Deployment}' \
  --output table

# 3. Check recent events for migration success
aws elasticbeanstalk describe-events \
  --environment-name treasury-plane-dev \
  --max-items 20 \
  --query 'Events[*].{Time:EventDate,Severity:Severity,Message:Message}' \
  --output table

# 4. SSH to leader instance and verify migrations
LEADER_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[0].InstanceId' \
  --output text)

aws ssm start-session --target $LEADER_ID

# On instance, check migrations were applied
cd /var/app/current
source /var/app/venv/*/bin/activate
source /opt/elasticbeanstalk/deployment/custom_env
python manage.py showmigrations | grep '\[X\]'  # Applied migrations
```

### Code Review Checklist

When reviewing PRs that include migrations:

- [ ] Migration files are named correctly (sequential numbers)
- [ ] Migration has no dependencies on uncommitted migrations
- [ ] Migration is backward compatible (for zero-downtime deployments)
- [ ] No raw SQL that could deadlock or take excessive time
- [ ] Data migrations process records in batches (not all at once)
- [ ] Migration includes rollback logic (`reverse_code` in `RunPython`)
- [ ] `.ebextensions` configuration has `leader_only: true`

## Recovery from Failed Deployment

If deployment fails due to race condition (before applying the fix):

### Immediate Steps

**Option A: Terminate Failed Instance (Forces New Deployment)**

```bash
# Find the failed instance (Red health)
FAILED_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[?HealthStatus==`Severe`].InstanceId | [0]' \
  --output text)

echo "Terminating failed instance: $FAILED_ID"

# Terminate it (EB will launch a replacement)
aws ec2 terminate-instances --instance-ids $FAILED_ID

# Monitor environment health until new instance is healthy
watch -n 10 'aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query "Environments[0].[Status,Health,HealthStatus]" \
  --output text'
```

**Option B: Manually Apply Migrations, Then Redeploy**

```bash
# SSH to any healthy instance
HEALTHY_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[?HealthStatus==`Ok`].InstanceId | [0]' \
  --output text)

aws ssm start-session --target $HEALTHY_ID

# On instance, manually run migrations
cd /var/app/current
source /var/app/venv/*/bin/activate
source /opt/elasticbeanstalk/deployment/custom_env

# Check current migration state
python manage.py showmigrations

# Run migrations manually
python manage.py migrate --noinput

# Exit SSH, then redeploy same version (should succeed now)
exit

# Trigger redeployment
aws elasticbeanstalk update-environment \
  --environment-name treasury-plane-dev \
  --version-label $(aws elasticbeanstalk describe-environments \
    --environment-names treasury-plane-dev \
    --query 'Environments[0].VersionLabel' \
    --output text)
```

### Long-Term Fix

After recovering:

1. **Update `.ebextensions`** to include `leader_only: true`
2. **Test locally** that the configuration works
3. **Commit and push** the fix
4. **Redeploy** with the corrected configuration
5. **Verify** all instances are healthy

## Related Issues

### Issue: Migration Timeout (Different from Race Condition)

If migrations take longer than the default 600 seconds (10 minutes), they will timeout even with `leader_only: true`. See:

- `/Users/corcoss/code/plane-gov/docs/solutions/infrastructure-issues/cloudfront-cache-policy-and-eb-migration-failures.md` (Issue 2 covers migration timeouts)

**Solution:** Increase timeout:

```yaml
container_commands:
  01_migrate:
    command: "python manage.py migrate --noinput"
    leader_only: true
    timeout: 1800 # 30 minutes
```

### Issue: Migration Deadlock (Different from Race Condition)

If migrations acquire exclusive locks on tables, concurrent requests from other instances can cause deadlocks. This is separate from the race condition.

**Solution:**

- Use database-level locking in migrations
- Put application in maintenance mode during complex migrations
- Use blue-green deployment for zero-downtime migrations

## Files Modified

- `/Users/corcoss/code/plane-gov/apps/api/.ebextensions/03-django.config` (or `05-django-init.config`)
  - Added `leader_only: true` to migration command

## Related Documentation

- [AWS Elastic Beanstalk Container Commands](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/customize-containers-ec2.html#linux-container-commands)
- [Django Migrations Documentation](https://docs.djangoproject.com/en/stable/topics/migrations/)
- [AWS Elastic Beanstalk Deployment Policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html)

## See Also

- `/Users/corcoss/code/plane-gov/docs/solutions/infrastructure-issues/cloudfront-cache-policy-and-eb-migration-failures.md` - Migration timeout issues
- `/Users/corcoss/code/plane-gov/docs/solutions/eb-deployment/secrets-management-shell-escaping.md` - Shell escaping for environment variables
- `/Users/corcoss/code/plane-gov/docs/solutions/deployment/cloudfront-single-domain-routing-eb-deployment-issues.md` - EB listener and deployment patterns

---

## Quick Reference

| Symptom                                      | Cause                                            | Fix                                          |
| -------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| One instance Red, one Green after deployment | Both instances ran migrations simultaneously     | Add `leader_only: true` to migration command |
| Command 01_migrate failed                    | Race condition on django_migrations table        | Add `leader_only: true` to migration command |
| Migrations already applied error             | Second instance tried to apply same migrations   | Add `leader_only: true` to migration command |
| Environment Degraded with 50% unhealthy      | Migration race condition on multi-instance setup | Add `leader_only: true` to migration command |

**The Fix:**

```yaml
container_commands:
  01_migrate:
    command: "python manage.py migrate --noinput"
    leader_only: true # This line solves the race condition
```
