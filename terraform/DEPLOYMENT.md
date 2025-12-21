# Treasury Plane - Deployment Guide

This document describes how to deploy Treasury Plane to AWS from scratch.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.6.0
3. **Node.js** and npm (for frontend builds)
4. **AWS Secrets** configured in Secrets Manager (database credentials, OIDC, etc.)

## Architecture

- **Backend**: Django on Elastic Beanstalk (Amazon Linux 2023, Python 3.11)
- **Database**: Aurora PostgreSQL Serverless v2
- **Cache**: ElastiCache Redis
- **Frontends**: React apps on S3 + CloudFront
  - `web`: Main application at root path
  - `admin`: God Mode at `/god-mode/` path
  - `space`: Requires SSR (not deployed to S3)
- **Load Balancer**: ALB with HTTPS (ACM certificate)

## Quick Deploy

```bash
# From scratch (all components)
./scripts/deploy-all.sh

# Just deploy apps (infrastructure already exists)
./scripts/deploy-all.sh --skip-terraform

# Just backend
./scripts/deploy-backend.sh

# Just a specific frontend
./scripts/deploy-frontend.sh web
./scripts/deploy-frontend.sh admin
```

## First-Time Setup

### 1. Configure Terraform Variables

Copy the example file and fill in your values:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform.tfvars with your AWS-specific values
```

Example configuration:

```hcl
project_name = "my-plane"
environment  = "dev"
aws_region   = "us-east-1"

# Optional: Custom domain (requires Route53 zone)
domain_name     = "plane.example.gov"
route53_zone_id = "ZXXXXXXXXXXXXX"  # Your Route53 zone ID

# Instance configuration
eb_instance_type = "t3.small"
eb_min_instances = 1
eb_max_instances = 2

# Enable/disable Redis
enable_redis = true
```

**Note:** `terraform.tfvars` is gitignored - never commit actual values.

### 2. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:

- VPC with public/private subnets
- Aurora PostgreSQL Serverless v2
- ElastiCache Redis (if enabled)
- ALB with HTTPS listener
- Elastic Beanstalk environment
- S3 buckets for frontends
- CloudFront distributions
- ACM certificate (if domain configured)

### 3. Configure Secrets

Before deploying the backend, ensure these secrets exist in AWS Secrets Manager:

- `treasury-plane/db-credentials` - Database connection info
- `treasury-plane/django-secret-key` - Django SECRET_KEY
- `treasury-plane/oidc-credentials` - OIDC client ID/secret
- `treasury-plane/app-config` - Application configuration

### 4. Deploy Backend

```bash
./scripts/deploy-backend.sh
```

This:

1. Packages the Django app with `.ebextensions` and `.platform` configs
2. Uploads to S3
3. Creates new EB application version
4. Deploys and waits for health check

### 5. Deploy Frontends

```bash
./scripts/deploy-frontend.sh web
./scripts/deploy-frontend.sh admin
```

This:

1. Builds the React app with correct environment variables
2. Uploads static assets to S3 (with cache headers)
3. Invalidates CloudFront cache

## Deployment Scripts

| Script               | Purpose                               |
| -------------------- | ------------------------------------- |
| `deploy-all.sh`      | Full deployment orchestrator          |
| `deploy-backend.sh`  | Deploy Django to Elastic Beanstalk    |
| `deploy-frontend.sh` | Deploy frontend apps to CloudFront/S3 |

## Key Configuration Files

| File                                | Purpose                        |
| ----------------------------------- | ------------------------------ |
| `terraform/terraform.tfvars`        | Environment-specific variables |
| `terraform/eb-environment.tf`       | EB environment settings        |
| `terraform/cloudfront.tf`           | CloudFront distributions       |
| `backend/.ebextensions/`            | EB container commands          |
| `backend/.platform/nginx/`          | nginx configuration            |
| `apps/admin/react-router.config.ts` | Admin basename config          |

## Known IaC Issues

This section documents issues discovered during deployment and their fixes.

### Issue 1: Secrets Manager 30-Day Recovery Window

**Problem**: After `terraform destroy`, AWS Secrets Manager schedules secrets for deletion with a 30-day recovery window (not immediate deletion). When running `terraform apply` again, you'll see:

```
Error: error creating Secrets Manager Secret: You can't create this secret
because a secret with this name is already scheduled for deletion.
```

**Affected secrets**:

- `treasury-plane/redis-config`
- `treasury-plane/db-credentials`
- `treasury-plane/django-secret-key`
- `treasury-plane/oidc-credentials`
- `treasury-plane/app-config`

**Fix**: Force delete the scheduled secrets before re-applying:

```bash
# Force delete all scheduled secrets
aws secretsmanager delete-secret --secret-id treasury-plane/redis-config --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id treasury-plane/db-credentials --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id treasury-plane/django-secret-key --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id treasury-plane/oidc-credentials --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id treasury-plane/app-config --force-delete-without-recovery

# Then re-run terraform apply
terraform apply
```

**Automated fix**: All secrets now use `recovery_window_in_days = var.environment == "prod" ? 30 : 0`:

- **Dev/test** (`environment != "prod"`): Immediate deletion, no 30-day issue
- **Production** (`environment = "prod"`): 30-day recovery window preserved for safety

---

### Issue 2: ALB Target Group Mismatch with Shared Elastic Beanstalk

**Problem**: When using a shared ALB with Elastic Beanstalk:

1. Terraform creates a target group (`treasury-plane-django`) and configures the ALB listener to use it
2. Elastic Beanstalk creates its OWN target group (`awseb-AWSEB-*`) and registers its instances there
3. The ALB listener points to Terraform's empty target group → **503 errors**

**Symptoms**:

- API returns HTTP 503
- EB health shows "Green"
- `treasury-plane-django` target group has 0 targets
- `awseb-*` target group has healthy targets

**Fix applied**:

1. **ALB listener lifecycle ignore** (`terraform/alb.tf`):

   ```hcl
   resource "aws_lb_listener" "https" {
     # ...
     lifecycle {
       ignore_changes = [default_action]
     }
   }
   ```

   This prevents Terraform from reverting EB's target group changes.

2. **Post-deployment fix script** (`scripts/fix-alb-target-group.sh`):
   Automatically updates the ALB listener to use EB's target group after backend deployment.

3. **Integrated into deploy-all.sh**:
   The fix script runs automatically after backend deployment (Step 2b).

**Manual fix** (if needed):

```bash
./scripts/fix-alb-target-group.sh
```

---

### Issue 3: pnpm Workspaces (Not npm)

**Problem**: Frontend deploy scripts used `npm ci` which requires `package-lock.json`, but this project uses pnpm workspaces with `pnpm-lock.yaml`.

**Error**:

```
npm ci can only install with an existing package-lock.json or npm-shrinkwrap.json
```

**Fix applied**: Updated `scripts/deploy-frontend.sh` to use pnpm:

```bash
pnpm install --frozen-lockfile
pnpm --filter "$APP" run build
```

---

## Troubleshooting

### EB Environment Shows Degraded Health

Check if the correct version is deployed:

```bash
aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query 'Environments[0].VersionLabel'
```

### CloudFront Returns Wrong Page

For the admin app, ensure CloudFront error responses use `/god-mode/index.html`:

```bash
# Check error response config
aws cloudfront get-distribution --id DIST_ID \
  --query 'Distribution.DistributionConfig.CustomErrorResponses'
```

### Terraform Wants to Recreate EB Environment

This is normal - EB environments have state drift. The `lifecycle.ignore_changes` block prevents this:

```hcl
lifecycle {
  ignore_changes = [
    setting,
    version_label,
    tags,
    tags_all,
  ]
}
```

### ALB Target Group Unhealthy

1. Check EB version matches expected:

   ```bash
   aws elasticbeanstalk describe-environments \
     --environment-names treasury-plane-dev \
     --query 'Environments[0].{Version:VersionLabel,Health:Health}'
   ```

2. Check target health:

   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(terraform output -raw django_target_group_arn)
   ```

3. Update to correct version if needed:
   ```bash
   aws elasticbeanstalk update-environment \
     --environment-name treasury-plane-dev \
     --version-label treasury-plane-v9
   ```

## Destroy Everything

```bash
cd terraform
terraform destroy
```

**Warning**: This destroys all infrastructure including the database. Take backups first.

## Related Documentation

- `docs/solutions/infrastructure-issues/cloudfront-eb-alb-deployment-patterns.md`
- `~/.claude/skills/terraform/SKILL.md`
