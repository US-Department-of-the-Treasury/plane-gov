# Plan: Fix Elastic Beanstalk Deployment

## Problem Statement

The Django backend deployment to Elastic Beanstalk has been failing repeatedly. Multiple deployment attempts have resulted in:

- "Command failed on instance" errors
- Environment stuck in "Grey" health status
- Inconsistent application versions across instances
- Environment rebuild required

## Root Cause Analysis

Based on comprehensive research, the following issues were identified:

### Critical Issues (Must Fix)

| #   | Issue                                   | File                                   | Impact                                                        |
| --- | --------------------------------------- | -------------------------------------- | ------------------------------------------------------------- |
| 1   | **DATABASE_URL format wrong**           | `.ebextensions/04-secrets.config:34`   | psycopg v3 requires `postgresql+psycopg://` not `postgres://` |
| 2   | **No migration command**                | `.ebextensions/02-python.config`       | Tables don't exist, app crashes on startup                    |
| 3   | **SharedLoadBalancer not working**      | `terraform/eb-environment.tf:43-44`    | EB instances not registered with ALB target group             |
| 4   | **Duplicate WSGIPath config**           | `.ebextensions/02-python.config:8-11`  | Conflicts with Procfile, causes confusion                     |
| 5   | **Secrets script fails silently**       | `.ebextensions/04-secrets.config`      | No error handling, deployment aborts without clear cause      |
| 6   | **Requirements install race condition** | `.ebextensions/02-python.config:14-16` | `leader_only: false` can cause race conditions                |

### Secondary Issues (Should Fix)

| #   | Issue                                     | File            | Impact                                                    |
| --- | ----------------------------------------- | --------------- | --------------------------------------------------------- |
| 7   | **No pre-deployment validation**          | Missing         | Deployment proceeds even if secrets unavailable           |
| 8   | **Gunicorn logs not going to CloudWatch** | `Procfile`      | Can't see application errors in CloudWatch                |
| 9   | **No startup health verification**        | Missing         | No check that app actually starts before marking healthy  |
| 10  | **OIDC secret empty**                     | Secrets Manager | May cause auth failures (non-blocking for initial deploy) |

---

## Implementation Plan

### Phase 1: Fix Configuration Files (No AWS Changes)

#### Step 1.1: Fix DATABASE_URL Format for psycopg v3

**File:** `backend/.ebextensions/04-secrets.config`

**Current (line 34):**

```bash
echo "export DATABASE_URL=\"postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}\"" >> $ENV_FILE
```

**Fix:**

```bash
echo "export DATABASE_URL=\"postgresql+psycopg://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}\"" >> $ENV_FILE
```

#### Step 1.2: Add Error Handling to Secrets Script

**File:** `backend/.ebextensions/04-secrets.config`

Add error handling after each AWS CLI call:

```bash
#!/bin/bash
set -e  # Exit on error

# Validate required environment variables
if [ -z "$AWS_REGION" ]; then
  AWS_REGION="us-east-1"
fi

# Function to fetch secret with error handling
fetch_secret() {
  local secret_arn="$1"
  local secret_name="$2"

  if [ -z "$secret_arn" ]; then
    echo "WARNING: $secret_name ARN not set, skipping"
    return 0
  fi

  echo "Fetching $secret_name..."
  local result=$(aws secretsmanager get-secret-value \
    --secret-id "$secret_arn" \
    --query SecretString \
    --output text \
    --region "$AWS_REGION" 2>&1)

  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to fetch $secret_name: $result"
    return 1
  fi

  echo "$result"
}
```

#### Step 1.3: Add Migration Command

**File:** `backend/.ebextensions/02-python.config`

Add migration command BEFORE collectstatic:

```yaml
container_commands:
  01_migrate:
    command: "/var/app/venv/*/bin/python manage.py migrate --noinput"
    leader_only: true

  02_collectstatic:
    command: "/var/app/venv/*/bin/python manage.py collectstatic --noinput"
    leader_only: true
```

#### Step 1.4: Remove Duplicate WSGIPath Configuration

**File:** `backend/.ebextensions/02-python.config`

Remove or comment out these lines (Procfile takes precedence):

```yaml
# REMOVE - conflicts with Procfile
# option_settings:
#   aws:elasticbeanstalk:container:python:
#     WSGIPath: "plane.wsgi:application"
#     NumProcesses: 3
#     NumThreads: 20
```

Keep only:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: "plane.settings.production"
    PYTHONPATH: "/var/app/current:$PYTHONPATH"
```

#### Step 1.5: Remove Redundant pip install

**File:** `backend/.ebextensions/02-python.config`

Remove this command (EB installs requirements automatically):

```yaml
# REMOVE - EB already does this
# container_commands:
#   01_install_requirements:
#     command: "/var/app/venv/*/bin/pip install -r requirements.txt"
#     leader_only: false
```

#### Step 1.6: Update Procfile for Better Logging

**File:** `backend/Procfile`

**Current:**

```
web: gunicorn plane.wsgi:application --bind 127.0.0.1:8000 --workers 3 --threads 4 --timeout 60 --access-logfile /var/app/current/logs/gunicorn.log --error-logfile /var/app/current/logs/gunicorn.log --log-level info
```

**Fix (log to stdout for CloudWatch):**

```
web: gunicorn plane.wsgi:application --bind 127.0.0.1:8000 --workers 3 --threads 4 --timeout 60 --access-logfile - --error-logfile - --capture-output --log-level info
```

### Phase 2: Add Pre-Deployment Validation

#### Step 2.1: Create Validation Hook

**New File:** `backend/.ebextensions/00-validate.config`

```yaml
files:
  "/opt/elasticbeanstalk/hooks/appdeploy/pre/00_validate.sh":
    mode: "000755"
    owner: root
    group: root
    content: |
      #!/bin/bash
      set -e

      echo "=========================================="
      echo "PRE-DEPLOYMENT VALIDATION"
      echo "=========================================="

      # Source EB environment
      if [ -f /opt/elasticbeanstalk/deployment/env ]; then
        source /opt/elasticbeanstalk/deployment/env
      fi

      # Validate required ARNs are set
      REQUIRED_VARS="DB_SECRET_ARN DJANGO_SECRET_ARN APP_CONFIG_SECRET_ARN AWS_REGION"

      for var in $REQUIRED_VARS; do
        if [ -z "${!var}" ]; then
          echo "ERROR: Required environment variable $var is not set"
          exit 1
        fi
        echo "OK: $var is set"
      done

      # Test Secrets Manager access
      echo "Testing Secrets Manager access..."
      aws secretsmanager describe-secret --secret-id "$DB_SECRET_ARN" --region "$AWS_REGION" > /dev/null 2>&1
      if [ $? -ne 0 ]; then
        echo "ERROR: Cannot access DB_SECRET_ARN. Check IAM permissions."
        exit 1
      fi
      echo "OK: Secrets Manager access verified"

      echo "=========================================="
      echo "PRE-DEPLOYMENT VALIDATION PASSED"
      echo "=========================================="
```

#### Step 2.2: Create Post-Deployment Health Verification

**New File:** `backend/.ebextensions/99-verify.config`

```yaml
container_commands:
  99_verify_health:
    command: |
      echo "Verifying application health..."
      sleep 5

      # Test that Django can start
      cd /var/app/current
      source /var/app/venv/*/bin/activate

      # Run Django check
      python manage.py check --deploy 2>&1 || {
        echo "ERROR: Django check failed"
        exit 1
      }

      echo "Django check passed"
    leader_only: true
```

### Phase 3: Fix ALB Integration

The SharedLoadBalancer configuration is not working as expected. We have two options:

#### Option A: Let EB Manage Its Own ALB (Recommended - Simpler)

**Changes to `terraform/eb-environment.tf`:**

Remove SharedLoadBalancer settings and let EB create its own ALB:

```hcl
# REMOVE these settings:
# setting {
#   namespace = "aws:elbv2:loadbalancer"
#   name      = "SharedLoadBalancer"
#   value     = aws_lb.main.arn
# }

# ADD these instead:
setting {
  namespace = "aws:elbv2:listener:443"
  name      = "Protocol"
  value     = "HTTPS"
}

setting {
  namespace = "aws:elbv2:listener:443"
  name      = "SSLCertificateArns"
  value     = aws_acm_certificate.main[0].arn
}
```

**Also remove from `terraform/alb.tf`:**

- The standalone ALB resource (lines ~1-50)
- ALB listeners (except keep Route53 records)

#### Option B: Use EB-Managed ALB but Keep DNS Records

If you want to keep the existing ALB configuration, modify:

**`terraform/eb-environment.tf`:**

```hcl
# Remove SharedLoadBalancer entirely
# Let EB create its own ALB

# Update Route53 to point to EB's ALB
data "aws_elastic_beanstalk_environment" "main" {
  name = aws_elastic_beanstalk_environment.main.name
}

# Use EB's load balancer for DNS
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_elastic_beanstalk_environment.main.endpoint_url
    zone_id                = data.aws_elastic_beanstalk_environment.main.load_balancers[0].zone_id
    evaluate_target_health = true
  }
}
```

### Phase 4: Testing and Validation

#### Step 4.1: Pre-Deploy Checklist

```bash
# 1. Verify secrets exist and have values
aws secretsmanager get-secret-value --secret-id treasury-plane/db-credentials --query SecretString --output text | jq .
aws secretsmanager get-secret-value --secret-id treasury-plane/django-secret-key --query SecretString --output text | jq .
aws secretsmanager get-secret-value --secret-id treasury-plane/app-config --query SecretString --output text | jq .

# 2. Verify database is accessible (from local with VPN)
# Note: May need to use bastion host or SSH tunnel

# 3. Verify IAM role has required permissions
aws iam get-role-policy --role-name treasury-plane-eb-ec2-role --policy-name secrets-access

# 4. Check environment status
aws elasticbeanstalk describe-environment-health \
  --environment-name treasury-plane-dev \
  --attribute-names All
```

#### Step 4.2: Deploy and Monitor

```bash
# Deploy with verbose logging
./scripts/deploy-backend.sh

# Monitor events in real-time
aws elasticbeanstalk describe-events \
  --environment-name treasury-plane-dev \
  --max-items 20 \
  --query 'Events[*].[EventDate,Severity,Message]' \
  --output table
```

#### Step 4.3: Log Retrieval Commands

```bash
# Request fresh logs
aws elasticbeanstalk request-environment-info \
  --environment-name treasury-plane-dev \
  --info-type bundle

# Wait 2 minutes, then retrieve
aws elasticbeanstalk retrieve-environment-info \
  --environment-name treasury-plane-dev \
  --info-type bundle \
  --query 'EnvironmentInfo[0].Message' \
  --output text | xargs curl -s -o logs.zip

# Extract and view
unzip logs.zip -d eb-logs/
cat eb-logs/var/log/eb-engine.log | tail -200
cat eb-logs/var/log/web.stdout.log | tail -200
```

---

## File Changes Summary

| File                                       | Action | Description                                 |
| ------------------------------------------ | ------ | ------------------------------------------- |
| `backend/.ebextensions/00-validate.config` | CREATE | Pre-deployment validation                   |
| `backend/.ebextensions/02-python.config`   | MODIFY | Add migrate, remove duplicates              |
| `backend/.ebextensions/04-secrets.config`  | MODIFY | Fix DATABASE_URL format, add error handling |
| `backend/.ebextensions/99-verify.config`   | CREATE | Post-deployment health check                |
| `backend/Procfile`                         | MODIFY | Log to stdout for CloudWatch                |
| `terraform/eb-environment.tf`              | MODIFY | Fix ALB integration                         |
| `terraform/alb.tf`                         | MODIFY | Remove standalone ALB (Option A)            |

---

## Success Criteria

1. **Deployment completes without errors** - No "Command failed" messages
2. **Environment health is Green** - All instances healthy
3. **Health endpoint responds** - `curl https://api.plane.example.gov/api/health/` returns 200
4. **Logs are visible** - CloudWatch shows gunicorn/Django logs
5. **Database connected** - Can create superuser via SSH

---

## Rollback Plan

If deployment fails after changes:

```bash
# 1. Revert to previous application version
aws elasticbeanstalk update-environment \
  --environment-name treasury-plane-dev \
  --version-label <previous-version>

# 2. If environment is broken, terminate and recreate
aws elasticbeanstalk terminate-environment \
  --environment-name treasury-plane-dev

# Then re-run terraform apply to recreate
cd terraform && terraform apply
```

---

## References

- AWS EB Python Platform Documentation
- Django on EB Best Practices
- psycopg v3 Connection String Format
- Project Files:
  - `backend/.ebextensions/*.config`
  - `backend/.platform/nginx/conf.d/piv-mtls.conf`
  - `terraform/eb-environment.tf`
  - `apps/api/plane/settings/production.py`
