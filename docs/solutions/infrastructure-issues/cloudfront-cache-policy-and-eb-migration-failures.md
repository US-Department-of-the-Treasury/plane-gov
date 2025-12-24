---
problem_type: infrastructure-deployment
component: aws-cloudfront-eb
symptoms:
  - "CloudFront error: The parameter HeaderBehavior is invalid for policy with caching disabled"
  - "EB deployment partial failure: one instance Red, one Green after migration"
  - "Environment goes to Degraded health with command 01_migrate failed"
tags:
  - cloudfront
  - cache-policy
  - elastic-beanstalk
  - migrations
  - leader-only
  - deployment-failures
related_components:
  - aws-cloudfront
  - aws-elastic-beanstalk
  - django-migrations
  - terraform
date_solved: 2025-12-23
---

# CloudFront Cache Policy and Elastic Beanstalk Migration Failures

This document covers two critical AWS deployment issues encountered during Treasury Plane infrastructure work.

---

## Issue 1: CloudFront Cache Policy Configuration Error

### Symptom

```
Error creating CloudFront Distribution: InvalidArgument: The parameter HeaderBehavior
is invalid for policy with caching disabled.
```

This occurs when creating a custom CloudFront cache policy with `max_ttl = 0` (caching disabled) while also trying to include headers in the cache key configuration.

### Root Cause

AWS CloudFront's API has a constraint: when caching is disabled (`max_ttl = 0`), you **cannot** configure cache key parameters like header whitelists. The rationale is that cache keys are only meaningful when caching is enabled.

However, you may still need to forward headers to the origin (e.g., for authentication, CORS, or API routing). Attempting to combine these in a single cache policy results in the error above.

**Invalid configuration example:**

```terraform
# THIS WILL FAIL
resource "aws_cloudfront_cache_policy" "api_no_cache" {
  name        = "api-no-cache"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0  # Caching disabled

  parameters_in_cache_key_and_forwarded_to_origin {
    headers_config {
      header_behavior = "whitelist"  # ERROR: Can't configure headers when caching disabled
      headers {
        items = ["Authorization", "Accept", "Content-Type"]
      }
    }
  }
}
```

### Solution

Use **two separate policies**:

1. **AWS Managed CachingDisabled Policy** - Handles the cache behavior (no caching)
2. **Custom Origin Request Policy** - Handles header/cookie/query forwarding

**Correct configuration:**

```terraform
# Use AWS managed CachingDisabled policy
locals {
  managed_cache_policy_caching_disabled = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
}

# Create custom origin request policy for forwarding
resource "aws_cloudfront_origin_request_policy" "api_forward_all" {
  name    = "${var.project_name}-api-forward-all"
  comment = "Forward all request data to API origin"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"  # Forward all viewer headers
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# Apply both policies to cache behavior
resource "aws_cloudfront_distribution" "unified" {
  # ... origins ...

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Separate concerns: caching vs forwarding
    cache_policy_id          = local.managed_cache_policy_caching_disabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id
  }
}
```

### Key Insights

| Aspect | Cache Policy | Origin Request Policy |
|--------|--------------|----------------------|
| **Purpose** | Controls what gets cached and for how long | Controls what data is forwarded to origin |
| **When caching disabled** | Cannot configure cache key parameters | Can still forward headers/cookies/queries |
| **Header behavior** | Only matters when caching enabled | Always applicable |
| **Best practice** | Use AWS managed policies when possible | Create custom for app-specific needs |

### AWS Managed Cache Policies

For common use cases, use AWS-provided managed cache policies:

| Policy Name | Policy ID | Use Case |
|-------------|-----------|----------|
| `CachingDisabled` | `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` | APIs, dynamic content, no caching |
| `CachingOptimized` | `658327ea-f89d-4fab-a63d-7e88639e58f6` | Static assets, SPAs, long TTL |
| `CachingOptimizedForUncompressedObjects` | `b2884449-e4de-46a7-ac36-70bc7f1ddd6d` | Large media files |

### Prevention Checklist

- [ ] If disabling caching (`max_ttl = 0`), use AWS managed `CachingDisabled` policy
- [ ] Create separate origin request policy for header/cookie forwarding needs
- [ ] Never mix cache key configuration with disabled caching
- [ ] Test CloudFront distribution creation in staging before production

**Verification:**

```bash
# Verify cache policy is correctly applied
aws cloudfront get-distribution --id $DISTRIBUTION_ID \
  --query 'Distribution.DistributionConfig.CacheBehaviors.Items[?PathPattern==`/api/*`].CachePolicyId'

# Should return: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
```

### Files Modified

- `/Users/corcoss/code/plane/terraform/cloudfront.tf` (lines 91-111, 173-174)

---

## Issue 2: Elastic Beanstalk Migration Partial Failure

### Symptom

Deploying Django application to Elastic Beanstalk with 2 instances:

- **Instance 1 (Leader)**: Red health, logs show "Command 01_migrate failed"
- **Instance 2 (Follower)**: Green health, no migration attempted
- **Environment**: Degraded/Red overall health
- **API**: May be partially accessible (follower serving traffic) or completely down

### Root Cause Analysis

EB deployments use `container_commands` with `leader_only: true` to run database migrations on only one instance. This pattern has several failure modes:

#### Primary Root Causes

1. **Migration Timeout**
   - Default container_commands timeout: **600 seconds (10 minutes)**
   - Long-running migrations (large data updates, index creation) exceed this limit
   - Leader instance fails, marks deployment as failed
   - Follower never attempts migration (leader_only ensures single execution)

2. **Database Connection Issues on Leader**
   - Network timeout reaching RDS from specific AZ
   - Security group rules not fully propagated
   - DB max_connections limit reached
   - SSL/TLS certificate validation failures

3. **Migration Conflicts**
   - Migration depends on data that doesn't exist yet
   - Conflicting migrations from parallel development branches
   - Migration applied in wrong order (Django dependency resolution issue)

4. **Resource Exhaustion on Leader**
   - Migration consumes excessive memory (OOM kill)
   - Disk space full during migration (transaction logs, temp tables)
   - CPU throttling on t3/t4g instance types (burst credits exhausted)

5. **Transaction Deadlock**
   - Migration acquires exclusive locks on tables
   - Concurrent requests from follower instance cause deadlock
   - Migration rolled back by PostgreSQL

#### Why One Instance Succeeds

The `leader_only: true` flag ensures migrations run on exactly one instance:

```yaml
container_commands:
  01_run_migrations:
    command: "python manage.py migrate --noinput"
    leader_only: true  # Only runs on instance designated as "leader"
```

**What happens:**

1. EB selects one instance as "leader" (usually first in alphabetical order by instance ID)
2. Leader runs migration, follower skips it
3. If leader fails migration, it goes Red
4. Follower never attempted migration, has no reason to fail, stays Green
5. Environment becomes Degraded because 50% instances are unhealthy

### Diagnosis Commands

```bash
# Check environment health details
aws elasticbeanstalk describe-environment-health \
  --environment-name treasury-plane-dev \
  --attribute-names All

# Get instance-level health
aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --attribute-names All

# View deployment logs (after requesting bundle)
aws elasticbeanstalk request-environment-info \
  --environment-name treasury-plane-dev \
  --info-type bundle

# Wait 30 seconds, then retrieve
aws elasticbeanstalk retrieve-environment-info \
  --environment-name treasury-plane-dev \
  --info-type bundle

# Check recent events
aws elasticbeanstalk describe-events \
  --environment-name treasury-plane-dev \
  --max-items 20 \
  --query 'Events[*].{Time:EventDate,Severity:Severity,Message:Message}' \
  --output table

# SSH to leader instance (if EC2 access enabled)
# Find leader instance ID from describe-instances-health output
aws ssm start-session --target i-xxxxxxxxx

# Check migration logs
tail -f /var/log/eb-engine.log
tail -f /var/app/current/migrate.log  # If logging configured
```

### Solutions

#### Immediate Fix: Complete Failed Deployment

If environment is in Degraded state with partial failure:

**Option A: Terminate leader instance (forces re-migration)**

```bash
# Find leader instance (the Red one)
LEADER_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[?HealthStatus==`Severe`].InstanceId | [0]' \
  --output text)

# Terminate it (EB will launch replacement)
aws ec2 terminate-instances --instance-ids $LEADER_ID

# New instance will attempt migration again
# Monitor environment health
watch -n 10 'aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query "Environments[0].[Status,Health]" \
  --output text'
```

**Option B: Run migration manually, then redeploy**

```bash
# SSH to any healthy instance
aws ssm start-session --target i-xxxxxxxxx

# Manually run migration
cd /var/app/current
source /var/app/venv/*/bin/activate
source /opt/elasticbeanstalk/deployment/custom_env
python manage.py migrate --noinput

# Exit SSH, then redeploy same version (should succeed now)
aws elasticbeanstalk update-environment \
  --environment-name treasury-plane-dev \
  --version-label treasury-plane-vYYYYMMDD-HHMMSS
```

#### Long-Term Solutions

**1. Increase Migration Timeout**

For migrations you know will take longer than 10 minutes:

```yaml
# .ebextensions/05-django-init.config
container_commands:
  01_run_migrations:
    command: |
      #!/bin/bash
      set -e
      cd /var/app/staging
      source /var/app/venv/staging-*/bin/activate
      source /opt/elasticbeanstalk/deployment/custom_env

      # Set statement timeout in PostgreSQL (safety net)
      export PGCONNECT_TIMEOUT=30
      export PGSTATEMENT_TIMEOUT=1800000  # 30 minutes

      python manage.py migrate --noinput
    leader_only: true
    timeout: 1800  # 30 minutes (in seconds)
```

**2. Test Migrations Locally First**

Before deploying, always test migration duration:

```bash
# Time the migration
cd apps/api
source venv/bin/activate

time python manage.py migrate --plan  # Dry run to see what will run
time python manage.py migrate --noinput  # Actual migration

# If > 5 minutes, consider:
# - Squashing migrations
# - Breaking into smaller migrations
# - Running outside deployment window
```

**3. Optimize Long Migrations**

```python
# Use RunPython with batch processing instead of single transaction
from django.db import migrations

def migrate_data_in_batches(apps, schema_editor):
    Model = apps.get_model('myapp', 'Model')

    # Process in batches of 1000
    batch_size = 1000
    total = Model.objects.count()

    for offset in range(0, total, batch_size):
        batch = Model.objects.all()[offset:offset + batch_size]
        for obj in batch:
            # Update obj
            obj.save()

        # Commit after each batch
        schema_editor.connection.close()

class Migration(migrations.Migration):
    dependencies = [('myapp', '0042_previous')]

    operations = [
        migrations.RunPython(
            migrate_data_in_batches,
            reverse_code=migrations.RunPython.noop
        )
    ]
```

**4. Use Rolling Deployments (Production)**

Change deployment policy from `AllAtOnce` to `Rolling`:

```terraform
# terraform/eb-environment.tf
resource "aws_elastic_beanstalk_environment" "main" {
  # ...

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"  # Instead of "AllAtOnce"
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
}
```

**Why this helps:**
- Migrations run on first batch (leader)
- If migration fails, deployment aborts before touching other instances
- Easier to rollback without full environment degradation

**5. Separate Migration from Deployment**

For critical production environments, run migrations as a separate step:

```bash
# Step 1: Run migration on single instance (before deployment)
./scripts/run-migration-on-eb.sh treasury-plane-prod

# Step 2: Deploy application code (no migration in container_commands)
./scripts/deploy-backend.sh treasury-plane-prod
```

**Migration script example:**

```bash
#!/bin/bash
# scripts/run-migration-on-eb.sh
set -e

EB_ENV="$1"

# Get any instance ID
INSTANCE_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name "$EB_ENV" \
  --query 'InstanceHealthList[0].InstanceId' \
  --output text)

echo "Running migration on instance: $INSTANCE_ID"

# Execute migration via SSM
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "cd /var/app/current",
    "source /var/app/venv/*/bin/activate",
    "source /opt/elasticbeanstalk/deployment/custom_env",
    "python manage.py migrate --noinput"
  ]' \
  --output text
```

Then remove migration from `.ebextensions`:

```yaml
# .ebextensions/05-django-init.config
container_commands:
  # 01_run_migrations removed - run separately via script

  02_register_instance:
    command: |
      # ... instance registration ...
    leader_only: true
```

**6. Monitor Migration Duration**

Add logging to track migration performance over time:

```python
# plane/settings/production.py
import logging
import time

logger = logging.getLogger('plane.migrations')

class MigrationLogger:
    def __init__(self):
        self.start_time = None

    def before_migrate(self, **kwargs):
        self.start_time = time.time()
        logger.info(f"Starting migration: {kwargs.get('app_label')} - {kwargs.get('migration_name')}")

    def after_migrate(self, **kwargs):
        duration = time.time() - self.start_time
        logger.info(f"Completed migration in {duration:.2f}s: {kwargs.get('app_label')}")

        # Alert if migration took > 5 minutes
        if duration > 300:
            logger.warning(f"SLOW MIGRATION: {kwargs.get('app_label')} took {duration:.2f}s")

# Connect signals
from django.db.models.signals import pre_migrate, post_migrate
migration_logger = MigrationLogger()
pre_migrate.connect(migration_logger.before_migrate)
post_migrate.connect(migration_logger.after_migrate)
```

### Prevention Checklist

Before deploying with new migrations:

- [ ] Test migration locally: `time python manage.py migrate --noinput`
- [ ] Check migration duration (flag if > 5 minutes)
- [ ] Verify migration is idempotent (safe to run multiple times)
- [ ] Review migration plan: `python manage.py migrate --plan`
- [ ] Check for conflicting migrations: `python manage.py showmigrations`
- [ ] Ensure database has sufficient disk space for migration
- [ ] If > 10 minutes, use separate migration step (don't deploy with container_commands)
- [ ] Set deployment policy to "Rolling" for production (not "AllAtOnce")
- [ ] Monitor first deployment closely (be ready to rollback)

### Post-Failure Recovery Checklist

If deployment fails with migration error:

- [ ] Get logs: `aws elasticbeanstalk request-environment-info --info-type bundle`
- [ ] Identify root cause (timeout, connection, deadlock, etc.)
- [ ] Check database state: Is migration partially applied?
- [ ] If partial: Manually complete migration or rollback
- [ ] If timeout: Increase timeout or run migration separately
- [ ] Terminate failed leader instance (force re-migration)
- [ ] Monitor new deployment until Green health

### Files Modified

- `/Users/corcoss/code/plane/apps/api/.ebextensions/05-django-init.config` (migration commands)
- `/Users/corcoss/code/plane/terraform/eb-environment.tf` (deployment policy settings)

---

## Quick Reference

| Issue | Root Cause | Solution | Prevention |
|-------|-----------|----------|------------|
| CloudFront HeaderBehavior error | Mixing cache key config with disabled caching | Use AWS managed `CachingDisabled` + separate origin request policy | Never configure cache keys when `max_ttl = 0` |
| EB migration partial failure | Long migration times out on leader instance | Increase timeout, test locally, use rolling deployment | Test migration duration before deploy |

## Related Documentation

- [AWS CloudFront Cache Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [AWS CloudFront Origin Request Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html)
- [Elastic Beanstalk Container Commands](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/customize-containers-ec2.html#linux-container-commands)
- [Django Migration Best Practices](https://docs.djangoproject.com/en/stable/topics/migrations/#data-migrations)
- [Elastic Beanstalk Deployment Policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html)

## See Also

- `/Users/corcoss/code/plane/docs/solutions/infrastructure-issues/cloudfront-eb-alb-deployment-patterns.md` - Related CloudFront and EB patterns
