# Skill and CLAUDE.md Update Proposals

Based on deployment learnings from Treasury Plane CloudFront single-domain routing migration.

## Executive Summary

**Primary recommendation:** Do NOT add to `~/.claude/CLAUDE.md` (already 197 lines / 12KB, exceeds 150-line threshold). Instead, update existing skills and create a new deployment troubleshooting checklist skill.

## Current State

| File | Lines | Size | Status |
|------|-------|------|--------|
| `~/.claude/CLAUDE.md` | 197 | 12KB | BLOATED (exceeds 150 lines) |
| `~/.claude/skills/terraform/SKILL.md` | 567 | - | Has room for EB patterns |
| `~/.claude/skills/gov-deployment/SKILL.md` | 163 | - | Has room for firewall patterns |

## Proposed Changes

### 1. Extract Content from CLAUDE.md (Reduce Bloat)

**Problem:** CLAUDE.md is 197 lines, exceeds the 150-line rule.

**Solution:** Extract "Infrastructure as Code - Hard Rules" section to terraform skill.

**What to extract (lines 37-84 in CLAUDE.md):**
```markdown
## Infrastructure as Code - Hard Rules

**Never deploy AWS infrastructure manually.** Always use Terraform.

### Self-Sufficient Infrastructure Principle

> `terraform apply` on an empty AWS account MUST result in:
> - All resources created
> - Health checks passing
> - Environment in "Green/Healthy" state
> - Ready for application deployment
>
> **If infrastructure requires manual fixing after Terraform, it's not IaC.**

When writing Terraform:
1. **Placeholders must pass health checks** - Never create text file placeholders. Create minimal apps that return 200 OK.
2. **Use lifecycle rules** - `ignore_changes = [version_label]` to prevent Terraform reverting deployments.
3. **Separation of concerns** - Terraform for infrastructure (rare), deploy scripts for application code (frequent).

### No-Cowboy Mode (Deployment Rules)

During deployments, you MUST:

1. **Never use AWS CLI to fix Terraform failures** unless:
   - User explicitly approves it
   - It's documented in `~/.claude/deployment-log.md`
   - The fix is added to Terraform afterward (no orphan resources)

2. **Always suggest Terraform fix first** - If `terraform apply` fails:
   - Fix the Terraform configuration
   - Re-run `terraform apply`
   - Document the fix for future reference

3. **Refuse to proceed** if:
   - Terraform config has "designed to fail" patterns (text placeholders)
   - Previous AWS CLI fixes haven't been codified in Terraform
   - Resources exist that aren't in Terraform state

4. **Track all deployments** in `~/.claude/deployment-log.md`:
   - Approach taken
   - What succeeded/failed
   - Lessons learned

### Patterns and Examples

For detailed Terraform patterns (static sites, databases, EB, security groups), see:
- `terraform` skill - Comprehensive patterns and self-sufficiency checklist
- `gov-infra-architect` agent - Full infrastructure architecture
```

**Replace in CLAUDE.md with:**
```markdown
## Infrastructure as Code - Hard Rules

**Never deploy AWS infrastructure manually.** Always use Terraform.

See `terraform` skill for complete IaC principles:
- Self-Sufficient Infrastructure Principle
- No-Cowboy Mode deployment rules
- Comprehensive patterns and examples
```

**This saves:** ~40 lines from CLAUDE.md

---

### 2. Update `terraform` Skill

**File:** `~/.claude/skills/terraform/SKILL.md`

**Add new section after existing content:**

```markdown
## Elastic Beanstalk + CloudFront + ALB Patterns

### Pattern: Single-Domain Routing (CloudFront → S3 + ALB)

Serve both static assets (S3) and API (ALB) from a single CloudFront domain using path-based routing.

**Use case:** Government deployments requiring single domain for ATO, simplified certificate management.

```hcl
# CloudFront distribution with path-based routing
resource "aws_cloudfront_distribution" "unified" {
  enabled             = true
  http_version        = "http2and3"
  price_class         = "PriceClass_100"
  comment             = "Unified distribution for frontend + API"
  aliases             = [var.domain_name]
  default_root_object = "index.html"

  # Origin 1: S3 for static assets
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "S3-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  # Origin 2: ALB for API
  origin {
    domain_name = aws_lb.main.dns_name  # Or EB ALB CNAME
    origin_id   = "ALB-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: Serve static assets from S3
  default_cache_behavior {
    target_origin_id       = "S3-static"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # CachingOptimized
  }

  # API routes: Forward to ALB
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Use AWS managed CachingDisabled + custom origin request policy
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id
  }

  # CRITICAL: Do NOT add custom_error_response blocks for API routes
  # They will intercept API 404s and return HTML instead of JSON
}

# Origin request policy for API (forward all headers/cookies/queries)
resource "aws_cloudfront_origin_request_policy" "api_forward_all" {
  name    = "${var.project_name}-api-forward-all"
  comment = "Forward all request data to API origin"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "allViewer"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}
```

**Key decisions:**

| Scenario | Recommendation | Reason |
|----------|---------------|--------|
| Simple deployment | Use EB-managed ALB | Fewer resources to manage |
| Complex routing (multiple EB envs) | Use Terraform-managed ALB | Full control over listeners/rules |
| Corporate/gov network access | Always use ports 80/443 | Non-standard ports blocked by firewalls |

---

### Pattern: Elastic Beanstalk with Terraform-Managed ALB

When you need full control over the ALB (custom listeners, WAF, multiple target groups):

```hcl
# 1. Create EB environment with shared load balancer
resource "aws_elastic_beanstalk_environment" "main" {
  name                = "${var.project_name}-${var.environment}"
  application         = aws_elastic_beanstalk_application.main.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.9.0 running Python 3.11"

  # Critical: Allow external ALB to use target group
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerIsShared"
    value     = "true"
  }

  # Use Terraform-managed security group for ALB
  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "ManagedSecurityGroup"
    value     = aws_security_group.alb.id
  }

  # Explicitly enable default listener (prevents 504 errors)
  setting {
    namespace = "aws:elbv2:listener:default"
    name      = "ListenerEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elbv2:listener:default"
    name      = "Protocol"
    value     = "HTTP"
  }

  setting {
    namespace = "aws:elbv2:listener:default"
    name      = "Port"
    value     = "80"
  }

  # Prevent Terraform from detecting EB-managed drift
  lifecycle {
    ignore_changes = [
      all_settings,
      setting,
    ]
  }
}

# 2. Reference EB's target group (don't create new one!)
data "aws_lb_target_groups" "eb" {
  depends_on = [aws_elastic_beanstalk_environment.main]

  tags = {
    elasticbeanstalk:environment-name = aws_elastic_beanstalk_environment.main.name
  }
}

# 3. Create Terraform-managed ALB
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection       = false
  enable_http2                     = true
  enable_cross_zone_load_balancing = true
}

# 4. Create listener that uses EB's target group
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_groups.eb.arns[0]
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

**Common pitfalls:**

1. **Target group conflict:** If you see "Target group can only be associated with one load balancer", you're trying to create a new target group instead of using EB's.
   - **Fix:** Use `data.aws_lb_target_groups.eb` to reference EB's target group

2. **504 Gateway Timeout from CloudFront:** ALB has no listeners enabled.
   - **Fix:** Set `aws:elbv2:listener:default.ListenerEnabled = true` in EB config

3. **API returns HTML instead of JSON:** CloudFront custom error responses are intercepting API 404s.
   - **Fix:** Remove `custom_error_response` blocks from distribution

4. **Corporate network can't reach ALB:** Non-standard ports blocked by firewall.
   - **Fix:** Always use ports 80/443, never 8080/8443

---

### Self-Sufficient Infrastructure Principle

> `terraform apply` on an empty AWS account MUST result in:
> - All resources created
> - Health checks passing
> - Environment in "Green/Healthy" state
> - Ready for application deployment
>
> **If infrastructure requires manual fixing after Terraform, it's not IaC.**

**Implementation rules:**

1. **Placeholders must pass health checks** - Never create text file placeholders. Create minimal apps that return 200 OK.
2. **Use lifecycle rules** - `ignore_changes = [version_label]` to prevent Terraform reverting deployments.
3. **Separation of concerns** - Terraform for infrastructure (rare), deploy scripts for application code (frequent).

**Example: EB placeholder app that passes health checks:**

```dockerfile
# Dockerfile
FROM python:3.11-slim
RUN pip install Flask gunicorn
COPY app.py /app/
WORKDIR /app
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]
```

```python
# app.py
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({"status": "OK", "version": "placeholder"})

@app.route('/')
def root():
    return jsonify({"message": "Infrastructure ready. Deploy application code."})
```

---

### No-Cowboy Mode (Deployment Rules)

During deployments, you MUST:

1. **Never use AWS CLI to fix Terraform failures** unless:
   - User explicitly approves it
   - It's documented in `~/.claude/deployment-log.md`
   - The fix is added to Terraform afterward (no orphan resources)

2. **Always suggest Terraform fix first** - If `terraform apply` fails:
   - Fix the Terraform configuration
   - Re-run `terraform apply`
   - Document the fix for future reference

3. **Refuse to proceed** if:
   - Terraform config has "designed to fail" patterns (text placeholders)
   - Previous AWS CLI fixes haven't been codified in Terraform
   - Resources exist that aren't in Terraform state

4. **Track all deployments** in `~/.claude/deployment-log.md`:
   - Approach taken
   - What succeeded/failed
   - Lessons learned

**Example deployment log entry:**

```markdown
## 2025-12-23: Treasury Plane CloudFront Migration

**Approach:** Terraform-managed ALB with EB target group, single-domain CloudFront routing

**Issues encountered:**
1. Target group conflict - EB and Terraform both tried to create target groups
   - Fix: Used `data.aws_lb_target_groups.eb` to reference existing
2. 504 errors from CloudFront - ALB listener disabled
   - Fix: Set `ListenerEnabled = true` in EB config
3. API returns HTML - Custom error responses intercepting API 404s
   - Fix: Removed `custom_error_response` blocks

**Lessons learned:**
- Always verify ALB listeners exist after EB creation
- Test ALB directly (not just through CloudFront) during troubleshooting
- Remove CloudFront error responses when using path-based API routing
```

---

### Post-Deployment Verification Script

```bash
#!/bin/bash
# verify-deployment.sh
set -e

ENV_NAME="$1"
CLOUDFRONT_DOMAIN="$2"

echo "Verifying deployment: $ENV_NAME"

# 1. Check EB environment health
EB_HEALTH=$(aws elasticbeanstalk describe-environments \
  --environment-names "$ENV_NAME" \
  --query 'Environments[0].Health' \
  --output text)

if [ "$EB_HEALTH" != "Green" ]; then
  echo "ERROR: EB environment not healthy: $EB_HEALTH"
  exit 1
fi

# 2. Get ALB ARN
ALB_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "$ENV_NAME" \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --names {} --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# 3. Verify ALB listeners exist
LISTENER_COUNT=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --query 'length(Listeners)' \
  --output text)

if [ "$LISTENER_COUNT" -eq 0 ]; then
  echo "ERROR: No ALB listeners found!"
  exit 1
fi

echo "✓ ALB has $LISTENER_COUNT listener(s)"

# 4. Check target group health
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn "$ALB_ARN" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

UNHEALTHY=$(aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
  --output json | jq '. | length')

if [ "$UNHEALTHY" -gt 0 ]; then
  echo "ERROR: $UNHEALTHY unhealthy targets"
  exit 1
fi

echo "✓ All targets healthy"

# 5. Test ALB directly
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/health")
if [ "$HTTP_CODE" -ne 200 ]; then
  echo "ERROR: ALB health check returned $HTTP_CODE"
  exit 1
fi

echo "✓ ALB health check passed"

# 6. Test CloudFront (if domain provided)
if [ -n "$CLOUDFRONT_DOMAIN" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN/api/health")
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo "ERROR: CloudFront API health check returned $HTTP_CODE"
    exit 1
  fi
  echo "✓ CloudFront API routing works"

  # Verify API returns JSON, not HTML
  RESPONSE=$(curl -s "https://$CLOUDFRONT_DOMAIN/api/health")
  if echo "$RESPONSE" | grep -q "<html>"; then
    echo "ERROR: API returned HTML instead of JSON"
    exit 1
  fi
  echo "✓ API returns JSON (not HTML)"
fi

echo ""
echo "All checks passed! Deployment verified."
```

---

### Reference Documentation

See `/Users/corcoss/code/plane/docs/solutions/deployment/cloudfront-single-domain-routing-eb-deployment-issues.md` for complete troubleshooting guide covering:

- Target group conflicts (Terraform vs EB ALB)
- Disabled ALB listeners (504 errors)
- SSM Parameter Store authentication failures
- CloudFront custom error responses breaking API routes
- Corporate firewall port restrictions
```

---

### 3. Update `gov-deployment` Skill

**File:** `~/.claude/skills/gov-deployment/SKILL.md`

**Add new section after existing content:**

```markdown
## Corporate Firewall and VPN Considerations

Government and corporate networks often have restrictive firewall policies that block non-standard ports.

### Port Restrictions

**Always use standard HTTPS/HTTP ports for ALBs and public-facing services:**

| Port | Protocol | Status | Use Case |
|------|----------|--------|----------|
| 443 | HTTPS | ✅ Usually allowed | Production traffic, ALBs |
| 80 | HTTP | ✅ Usually allowed | Redirect to 443 |
| 8080 | HTTP | ❌ Often blocked | Development only |
| 8443 | HTTPS | ❌ Often blocked | Development only |
| 3000 | HTTP | ❌ Often blocked | Local dev only |

**Symptoms of blocked ports:**
```bash
curl http://myapp-alb-123.us-gov-west-1.elb.amazonaws.com:8080/health
# Returns 504 after timeout
# HTML contains: <title>Zscaler | Web Gateway</title>
```

This indicates corporate proxy (Zscaler, Palo Alto, etc.) intercepted and blocked the request.

**Solution:**

```terraform
# terraform/alb.tf
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443  # NOT 8443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80  # NOT 8080
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### Testing from Corporate Networks

When testing AWS deployments from government laptops with always-on VPN:

**Don't test:**
- Direct ALB access on non-standard ports (will be blocked)
- HTTP traffic (may be intercepted/modified by SSL inspection)

**Do test:**
- CloudFront domains (always use 443, work through corporate proxies)
- AWS Console access (verify instance health, logs)
- From personal device on home network (to isolate VPN issues)

**Troubleshooting decision tree:**

```
Can't reach ALB from corporate laptop?
├─ Using non-standard port (8080, 8443)? → Change to 80/443
├─ Using standard port but still blocked? → Test via CloudFront instead
└─ CloudFront also fails? → Check security groups, ALB listeners
```

### Robots.txt for Non-Production Environments

Always add restrictive `robots.txt` for non-production deploys on .gov domains:

```
# static-assets/robots.txt
User-agent: *
Disallow: /

# Prevent indexing of development/testing environments
```

Add to S3 bucket or serve from application root.

---

## SSM Parameter Store for Secrets

Government applications must store secrets in AWS SSM Parameter Store (not hardcoded in environment variables or Terraform).

### IAM Permissions for EB Instances

```terraform
# terraform/iam.tf
resource "aws_iam_role_policy" "eb_ssm_access" {
  name = "${var.project_name}-eb-ssm-access"
  role = aws_iam_role.eb_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/*"
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = aws_kms_key.ssm.arn
      }
    ]
  })
}

resource "aws_iam_instance_profile" "eb" {
  name = "${var.project_name}-eb-instance-profile"
  role = aws_iam_role.eb_instance_role.name
}
```

### Fetching Secrets in .ebextensions

```yaml
# .ebextensions/01-env-vars.config
commands:
  01_fetch_ssm_secrets:
    command: |
      #!/bin/bash
      set -e

      # Fetch secrets from SSM Parameter Store
      DB_PASSWORD=$(aws ssm get-parameter \
        --name "/${PROJECT_NAME}/${ENV}/db-password" \
        --with-decryption \
        --region ${AWS_REGION} \
        --query 'Parameter.Value' \
        --output text)

      SECRET_KEY=$(aws ssm get-parameter \
        --name "/${PROJECT_NAME}/${ENV}/django-secret-key" \
        --with-decryption \
        --region ${AWS_REGION} \
        --query 'Parameter.Value' \
        --output text)

      # Write to file sourced by EB
      cat > /opt/elasticbeanstalk/deployment/custom_env <<EOF
      export DATABASE_PASSWORD="${DB_PASSWORD}"
      export SECRET_KEY="${SECRET_KEY}"
      EOF

      chmod 644 /opt/elasticbeanstalk/deployment/custom_env
```

**Critical:** This must run in `commands` (not `container_commands`) to ensure secrets are available before Django starts.

### Troubleshooting SSM Access

**Symptom:** New EB instances fail with "password authentication failed" but existing instances work.

**Diagnosis:**

```bash
# SSH to failing instance
aws ssm start-session --target $INSTANCE_ID

# Check if SSM parameters can be fetched
aws ssm get-parameter --name "/myapp/dev/db-password" --with-decryption

# If AccessDenied, check IAM role permissions
aws sts get-caller-identity
# Should show instance profile role

# Check instance profile is attached to EC2 instance
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].IamInstanceProfile'
```

**Common fixes:**

1. IAM role missing SSM permissions → Add policy above
2. VPC in private subnets without NAT → Add VPC endpoints for SSM
3. Shell escaping issues with special characters → Use proper quoting (see `/Users/corcoss/code/plane/docs/solutions/eb-deployment/secrets-management-shell-escaping.md`)

### VPC Endpoints for SSM (Private Subnets)

```terraform
# terraform/vpc-endpoints.tf
resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ssm"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ssmmessages"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project_name}-vpc-endpoints"
  description = "Allow HTTPS to VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eb_instance.id]
  }
}
```
```

---

### 4. Create New Skill: `aws-deployment-troubleshooting`

**File:** `~/.claude/skills/aws-deployment-troubleshooting/SKILL.md`

This skill provides quick troubleshooting workflows for common AWS deployment issues.

```markdown
---
name: aws-deployment-troubleshooting
description: Quick troubleshooting workflows for common AWS deployment issues (CloudFront, ALB, EB, SSM). Use this skill when deployments fail with 504 errors, authentication issues, or API routing problems. Triggers on CloudFront 504, EB Red health, database auth failures, or ALB target group issues.
---

# AWS Deployment Troubleshooting

Quick reference for diagnosing and fixing common deployment issues.

## Quick Diagnostics Decision Tree

```
Symptom: 504 Gateway Timeout from CloudFront
├─ Check ALB listeners exist
│  └─ aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN
│     ├─ Empty → Enable listener in EB config (ListenerEnabled: true)
│     └─ Listeners exist → Check target group health
│
├─ Check target group health
│  └─ aws elbv2 describe-target-health --target-group-arn $TG_ARN
│     ├─ Unhealthy → Check EB application version
│     └─ Healthy → Check CloudFront origin config
│
└─ Check CloudFront origin
   └─ Verify domain_name matches ALB DNS
```

```
Symptom: API returns HTML instead of JSON
└─ Check CloudFront custom_error_response blocks
   └─ If present → Remove them (breaks API 404s)
```

```
Symptom: New EB instances fail database auth
├─ Check IAM permissions for ssm:GetParameter
├─ Verify SSM parameters exist in Parameter Store
├─ Check VPC endpoints for SSM (if private subnets)
└─ Review .ebextensions for shell escaping issues
```

```
Symptom: Corporate network can't reach ALB (Zscaler error)
└─ Change ALB listener to port 443 (not 8080/8443)
```

---

## CloudFront 504 Errors

### Symptom
CloudFront returns 504 Gateway Timeout when accessing any route.

### Quick Check
```bash
# Get ALB from EB environment
ALB_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name treasury-plane-dev \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --names {} --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Check listeners (should show port 80 and/or 443)
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN

# If empty, listener is disabled
```

### Fix: Enable Listener
```terraform
# terraform/eb-environment.tf
setting {
  namespace = "aws:elbv2:listener:default"
  name      = "ListenerEnabled"
  value     = "true"
}

setting {
  namespace = "aws:elbv2:listener:default"
  name      = "Protocol"
  value     = "HTTP"
}

setting {
  namespace = "aws:elbv2:listener:default"
  name      = "Port"
  value     = "80"
}
```

Apply Terraform, then verify:
```bash
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN
# Should show at least one listener
```

---

## API Returns HTML Instead of JSON

### Symptom
```bash
curl https://example.com/api/health
# Returns: <html><body>...</body></html>
# Expected: {"status": "OK"}
```

### Root Cause
CloudFront `custom_error_response` redirects all 404s (including API 404s) to `/index.html`.

### Fix
Remove `custom_error_response` blocks from CloudFront distribution:

```terraform
# terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "unified" {
  # ... origins and behaviors ...

  # REMOVE THESE:
  # custom_error_response {
  #   error_code         = 404
  #   response_code      = 200
  #   response_page_path = "/index.html"
  # }
}
```

Apply Terraform, invalidate cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/api/*"
```

---

## Database Authentication Failures on New Instances

### Symptom
One EB instance works, new instances fail with:
```
FATAL: password authentication failed for user "plane_admin"
```

### Diagnosis
```bash
# SSH to failing instance
INSTANCE_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[?HealthStatus==`Severe`].InstanceId | [0]' \
  --output text)

aws ssm start-session --target $INSTANCE_ID

# Check if SSM parameter can be fetched
aws ssm get-parameter --name "/treasury-plane/dev/db-password" --with-decryption

# If AccessDenied, IAM role is missing permissions
```

### Fix: Add IAM Permissions
```terraform
# terraform/iam.tf
resource "aws_iam_role_policy" "eb_ssm_access" {
  name = "${var.project_name}-eb-ssm-access"
  role = aws_iam_role.eb_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:*:*:parameter/${var.project_name}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.ssm.arn
      }
    ]
  })
}
```

### Fix: Fetch Secrets in .ebextensions
```yaml
# .ebextensions/01-env-vars.config
commands:
  01_fetch_ssm_secrets:
    command: |
      #!/bin/bash
      set -e
      DB_PASSWORD=$(aws ssm get-parameter \
        --name "/treasury-plane/dev/db-password" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text)

      cat > /opt/elasticbeanstalk/deployment/custom_env <<EOF
      export DATABASE_PASSWORD="${DB_PASSWORD}"
      EOF

      chmod 644 /opt/elasticbeanstalk/deployment/custom_env
```

---

## Target Group Conflict (Terraform vs EB)

### Symptom
```
Error: Target group can only be associated with one load balancer
```

### Root Cause
Both Terraform and EB are trying to create/associate the same target group.

### Fix: Reference EB's Target Group
```terraform
# Don't create target group, reference EB's
data "aws_lb_target_groups" "eb" {
  depends_on = [aws_elastic_beanstalk_environment.main]

  tags = {
    elasticbeanstalk:environment-name = aws_elastic_beanstalk_environment.main.name
  }
}

# Use in listener
resource "aws_lb_listener" "https" {
  # ...
  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_groups.eb.arns[0]
  }
}
```

---

## Corporate Firewall Blocks ALB (Zscaler)

### Symptom
```bash
curl http://myapp-alb.us-gov-west-1.elb.amazonaws.com:8080/health
# Returns 504, HTML contains "Zscaler"
```

### Fix: Use Port 443
```terraform
# terraform/alb.tf
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443  # NOT 8443 or 8080
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

Test from corporate network:
```bash
curl -v https://myapp-alb.us-gov-west-1.elb.amazonaws.com/health
# Should work on 443
```

---

## Post-Deployment Verification Script

Save this script and run after every deployment:

```bash
#!/bin/bash
# verify-deployment.sh
set -e

ENV_NAME="$1"
CLOUDFRONT_DOMAIN="$2"

if [ -z "$ENV_NAME" ]; then
  echo "Usage: $0 <eb-environment-name> [cloudfront-domain]"
  exit 1
fi

echo "Verifying deployment: $ENV_NAME"

# 1. Check EB health
EB_HEALTH=$(aws elasticbeanstalk describe-environments \
  --environment-names "$ENV_NAME" \
  --query 'Environments[0].Health' \
  --output text)

if [ "$EB_HEALTH" != "Green" ]; then
  echo "❌ EB environment not healthy: $EB_HEALTH"
  exit 1
fi
echo "✅ EB environment: $EB_HEALTH"

# 2. Check ALB listeners
ALB_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "$ENV_NAME" \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --names {} --query 'LoadBalancers[0].LoadBalancerArn' --output text)

LISTENER_COUNT=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --query 'length(Listeners)' \
  --output text)

if [ "$LISTENER_COUNT" -eq 0 ]; then
  echo "❌ No ALB listeners found"
  exit 1
fi
echo "✅ ALB listeners: $LISTENER_COUNT"

# 3. Check target group health
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn "$ALB_ARN" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

UNHEALTHY=$(aws elbv2 describe-target-health \
  --target-group-arn "$TG_ARN" \
  --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
  --output json | jq '. | length')

if [ "$UNHEALTHY" -gt 0 ]; then
  echo "❌ $UNHEALTHY unhealthy targets"
  exit 1
fi
echo "✅ All targets healthy"

# 4. Test ALB directly
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$ALB_DNS/health" || echo "000")
if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ ALB health check returned $HTTP_CODE"
  exit 1
fi
echo "✅ ALB health check: $HTTP_CODE"

# 5. Test CloudFront (if provided)
if [ -n "$CLOUDFRONT_DOMAIN" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_DOMAIN/api/health" || echo "000")
  if [ "$HTTP_CODE" -ne 200 ]; then
    echo "❌ CloudFront API health check returned $HTTP_CODE"
    exit 1
  fi
  echo "✅ CloudFront API: $HTTP_CODE"

  # Verify API returns JSON
  RESPONSE=$(curl -s "https://$CLOUDFRONT_DOMAIN/api/health")
  if echo "$RESPONSE" | grep -q "<html>"; then
    echo "❌ API returned HTML instead of JSON"
    exit 1
  fi
  echo "✅ API returns JSON (not HTML)"
fi

echo ""
echo "🎉 All checks passed!"
```

**Usage:**
```bash
./verify-deployment.sh treasury-plane-dev example.com
```

---

## Related Documentation

- `/Users/corcoss/code/plane/docs/solutions/deployment/cloudfront-single-domain-routing-eb-deployment-issues.md` - Complete troubleshooting guide
- `/Users/corcoss/code/plane/docs/solutions/infrastructure-issues/cloudfront-cache-policy-and-eb-migration-failures.md` - Cache policies and migrations
- `/Users/corcoss/code/plane/docs/solutions/eb-deployment/secrets-management-shell-escaping.md` - SSM shell escaping
```

---

## Implementation Plan

### Phase 1: Clean Up CLAUDE.md (Priority: High)
1. Extract "Infrastructure as Code - Hard Rules" section from CLAUDE.md
2. Move to `~/.claude/skills/terraform/SKILL.md`
3. Replace with short reference in CLAUDE.md
4. Verify CLAUDE.md is under 150 lines

### Phase 2: Update Existing Skills (Priority: High)
1. Add EB + CloudFront patterns to `terraform` skill
2. Add corporate firewall + SSM sections to `gov-deployment` skill

### Phase 3: Create New Skill (Priority: Medium)
1. Create `~/.claude/skills/aws-deployment-troubleshooting/SKILL.md`
2. Add quick diagnostics and verification scripts

### Phase 4: Validation (Priority: High)
1. Test skills with sample deployment scenarios
2. Verify cross-references between skills and docs work correctly
3. Update skill descriptions in `~/.claude.json` if needed

---

## Files to Modify

| File | Action | Lines Added | Priority |
|------|--------|-------------|----------|
| `~/.claude/CLAUDE.md` | Extract content | -40 lines | High |
| `~/.claude/skills/terraform/SKILL.md` | Add EB patterns | +300 lines | High |
| `~/.claude/skills/gov-deployment/SKILL.md` | Add firewall + SSM | +150 lines | High |
| `~/.claude/skills/aws-deployment-troubleshooting/SKILL.md` | Create new | +250 lines | Medium |

---

## Questions for User

1. Should we create the new `aws-deployment-troubleshooting` skill, or merge that content into `terraform` or `gov-deployment` instead?
2. Is the deployment verification script useful enough to keep as a standalone script in `~/.claude/scripts/`, or should it stay in the skill as documentation?
3. Should we extract the "Docker on Apple Silicon for AWS" section from CLAUDE.md to a skill as well (also contributes to bloat)?

---

## Summary

**Recommended immediate actions:**
1. ✅ Solution document created: `/Users/corcoss/code/plane/docs/solutions/deployment/cloudfront-single-domain-routing-eb-deployment-issues.md`
2. ⏳ Extract IaC rules from CLAUDE.md → terraform skill
3. ⏳ Add firewall + SSM patterns to gov-deployment skill
4. ⏳ Optionally create aws-deployment-troubleshooting skill

**This approach:**
- Keeps CLAUDE.md under 150 lines (reduces bloat)
- Compounds learnings into reusable skills
- Provides quick reference for future deployments
- Maintains separation of concerns (terraform = infrastructure, gov-deployment = government-specific patterns, troubleshooting = diagnostics)
