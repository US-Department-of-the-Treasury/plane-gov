---
problem_type: infrastructure-deployment
component: aws-cloudfront-eb-alb-ssm
symptoms:
  - "504 Gateway Timeout from CloudFront to Elastic Beanstalk ALB"
  - "Target group can only be associated with one load balancer"
  - "EB environment has ListenerEnabled: false, no ALB listeners exist"
  - "password authentication failed for user on new EB instances"
  - "API endpoints return frontend HTML instead of JSON"
  - "Corporate VPN returns 504 with Zscaler in response"
tags:
  - cloudfront
  - elastic-beanstalk
  - alb
  - ssm-parameter-store
  - single-domain-routing
  - listener-configuration
  - secrets-management
  - corporate-firewall
related_components:
  - aws-cloudfront
  - aws-elastic-beanstalk
  - aws-alb
  - aws-ssm
  - terraform
  - zscaler-vpn
date_solved: 2025-12-23
---

# CloudFront Single-Domain Routing and Elastic Beanstalk Deployment Issues

This document captures critical deployment patterns and failure modes discovered during the Treasury Plane infrastructure migration to single-domain CloudFront routing (serving both S3 static assets and EB API from one domain).

**Context:** Migrating from separate CloudFront distributions (one per app) to a unified distribution with path-based routing: `/api/*` → ALB, `/` → S3 static assets.

---

## Issue 1: Terraform ALB vs Elastic Beanstalk ALB Conflict

### Symptom

```
Error: error associating ELB Target Group with ELB: ValidationError:
Target group can only be associated with one load balancer
```

Terraform ALB creation succeeds, but attaching target group fails because EB already created its own ALB and claimed the target group.

### Root Cause

When using Elastic Beanstalk with load balancer enabled, EB automatically provisions:
- Application Load Balancer
- Target group
- Auto-scaling group registration to target group
- Security groups for ALB and instances

If Terraform **also** creates a separate ALB and tries to use the same target group, AWS rejects it with the error above.

**Architecture mismatch:**

```
BAD PATTERN:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ CloudFront  │────▶│ Terraform ALB│────▶│ Target Group│◀───┐
└─────────────┘     └──────────────┘     └─────────────┘    │
                                                              │
                    ┌──────────────┐     ┌─────────────┐    │
                    │  EB ALB      │────▶│  (tries to  │────┘
                    └──────────────┘     │  claim same)│
                                         └─────────────┘
                                              ERROR!
```

### Solution Patterns

#### Option A: Use Only EB-Managed ALB (Recommended for Simple Deployments)

Let EB create and manage the ALB. Point CloudFront directly to it.

```terraform
# terraform/cloudfront.tf
resource "aws_cloudfront_origin" "api" {
  domain_name = aws_elastic_beanstalk_environment.main.cname  # EB ALB domain
  origin_id   = "ALB-api"

  custom_origin_config {
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"  # EB ALB terminates SSL
    origin_ssl_protocols   = ["TLSv1.2"]
  }
}
```

**Pros:**
- Simpler configuration (one less resource to manage)
- EB handles ALB lifecycle automatically
- No target group conflicts

**Cons:**
- Limited control over ALB settings (must use EB's `.ebextensions` for customization)
- Certificate management tied to EB environment

#### Option B: Terraform ALB with EB Target Group (Recommended for Complex Routing)

Terraform creates the ALB but references EB's target group (not creates its own).

```terraform
# terraform/alb.tf
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
  enable_http2               = true
  enable_cross_zone_load_balancing = true
}

# Reference EB's target group (don't create new one)
data "aws_lb_target_groups" "eb" {
  depends_on = [aws_elastic_beanstalk_environment.main]

  tags = {
    elasticbeanstalk:environment-name = aws_elastic_beanstalk_environment.main.name
  }
}

# Create listener that uses EB's target group
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_groups.eb.arns[0]  # Use EB's target group
  }
}
```

**Critical:** Configure EB to NOT create its own ALB:

```terraform
# terraform/eb-environment.tf
resource "aws_elastic_beanstalk_environment" "main" {
  # ...

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "ManagedSecurityGroup"
    value     = aws_security_group.alb.id
  }

  # IMPORTANT: Let EB create target group, but not ALB
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerIsShared"
    value     = "true"  # Allows external ALB to use target group
  }
}
```

**Pros:**
- Full control over ALB (custom listeners, rules, certificates)
- Can attach multiple target groups from different EB environments
- Easier to add WAF, Shield, or custom routing rules

**Cons:**
- More complex Terraform dependencies
- Must manually manage ALB lifecycle

### Prevention Checklist

When using Terraform + EB together:

- [ ] Decide: Will Terraform or EB manage the ALB?
- [ ] If Terraform manages ALB: Set `LoadBalancerIsShared = true` in EB config
- [ ] If EB manages ALB: Reference EB's ALB domain in CloudFront origin
- [ ] Never create two ALBs that both try to register the same target group
- [ ] Verify target group association: `aws elbv2 describe-target-groups --target-group-arns $TG_ARN`

---

## Issue 2: Elastic Beanstalk Listener Disabled by Default

### Symptom

CloudFront returns **504 Gateway Timeout** when accessing `/api/*` routes. EB environment shows Green health, but ALB has no listeners.

```bash
# Check ALB listeners
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN

# Output: {"Listeners": []}  # EMPTY!
```

### Root Cause

When EB environment is created with certain load balancer configurations (especially when using `LoadBalancerIsShared = true`), the default listener may be disabled.

**EB creates:**
- ALB resource
- Target group
- **Listener with `Enabled: false`** (not receiving traffic!)

This can happen when:
1. Terraform creates EB environment before ALB listener is ready
2. EB config has conflicting listener settings (e.g., trying to use both HTTP and HTTPS with same port)
3. Security group rules aren't allowing traffic to listener port

### Diagnosis

```bash
# 1. Get ALB ARN from EB environment
ALB_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name treasury-plane-dev \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --names {} --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# 2. Check listeners (expect HTTP:80 and/or HTTPS:443)
aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN

# 3. If empty, check EB configuration
aws elasticbeanstalk describe-configuration-settings \
  --application-name treasury-plane \
  --environment-name treasury-plane-dev \
  --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elbv2:listener:default`]'

# 4. Verify EB instances are registered to target group
TG_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn $ALB_ARN \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

### Solution

#### Option A: Enable Default Listener via EB Configuration

```terraform
# terraform/eb-environment.tf
resource "aws_elastic_beanstalk_environment" "main" {
  # ...

  # Explicitly enable default listener
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

  # Optional: Add HTTPS listener
  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "ListenerEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "Protocol"
    value     = "HTTPS"
  }

  setting {
    namespace = "aws:elbv2:listener:443"
    name      = "SSLCertificateArns"
    value     = aws_acm_certificate.main.arn
  }
}
```

Apply Terraform and EB will update the listener state.

#### Option B: Manually Enable Listener (Temporary Fix)

If Terraform apply isn't immediately possible:

```bash
# Get listener ARN (even if disabled, it exists)
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)

# Enable listener
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --enabled true

# Verify
aws elbv2 describe-listeners --listener-arns $LISTENER_ARN \
  --query 'Listeners[0].Enabled'
```

**Important:** This is a temporary fix. EB may revert it on next deployment. Always codify in Terraform.

#### Option C: Use Terraform-Managed ALB with Explicit Listener

```terraform
# terraform/alb.tf
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
```

This ensures listeners are explicitly created and managed by Terraform, not EB.

### Prevention Checklist

After creating EB environment:

- [ ] Verify ALB listeners exist: `aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN`
- [ ] Check listener is enabled: `Enabled: true` in output
- [ ] Test ALB directly (bypass CloudFront): `curl http://$ALB_DNS/health`
- [ ] Verify target group health: `aws elbv2 describe-target-health --target-group-arn $TG_ARN`
- [ ] If using Terraform ALB, explicitly create listeners (don't rely on EB)

---

## Issue 3: Database Password Authentication Failures on New EB Instances

### Symptom

One EB instance works fine, but new instances fail with:

```
FATAL: password authentication failed for user "plane_admin"
django.db.utils.OperationalError: connection to server failed
```

**Pattern:**
- Existing instances: Can connect to RDS ✅
- Newly launched instances: Cannot connect to RDS ❌
- Database credentials: Stored in AWS SSM Parameter Store

### Root Cause

EB instances fetch secrets from SSM Parameter Store during initialization (`.ebextensions/env-vars.config`). New instances may fail to fetch secrets due to:

1. **IAM role permissions missing** - Instance profile doesn't have `ssm:GetParameter` permission
2. **Parameter Store paths incorrect** - Instance is fetching from wrong SSM path
3. **Shell escaping issues** - Special characters in password break shell substitution
4. **SSM endpoint unreachable** - Security group or VPC endpoint misconfigured
5. **Race condition** - Django starts before SSM parameters are fetched

### Diagnosis

```bash
# 1. SSH to failing instance
INSTANCE_ID=$(aws elasticbeanstalk describe-instances-health \
  --environment-name treasury-plane-dev \
  --query 'InstanceHealthList[?HealthStatus==`Severe`].InstanceId | [0]' \
  --output text)

aws ssm start-session --target $INSTANCE_ID

# 2. Check if SSM parameters can be fetched
aws ssm get-parameter --name "/treasury-plane/dev/db-password" --with-decryption

# If this fails with AccessDenied, IAM role is missing permissions

# 3. Check environment variables
env | grep DATABASE

# If empty or placeholder values, SSM fetching failed

# 4. Check EB deployment logs
sudo tail -f /var/log/eb-engine.log
sudo tail -f /var/log/eb-activity.log

# Look for "SSM parameter not found" or "Permission denied"

# 5. Test database connection manually
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
```

### Solution

#### Fix 1: Ensure IAM Role Has SSM Permissions

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
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.ssm.arn  # If using KMS-encrypted parameters
      }
    ]
  })
}

# Attach to EB instance profile
resource "aws_iam_instance_profile" "eb" {
  name = "${var.project_name}-eb-instance-profile"
  role = aws_iam_role.eb_instance_role.name
}

# Reference in EB environment
resource "aws_elastic_beanstalk_environment" "main" {
  # ...

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb.name
  }
}
```

#### Fix 2: Fetch SSM Parameters During Deployment (Not Runtime)

Use `.ebextensions` to fetch secrets at deployment time and set as environment variables:

```yaml
# apps/api/.ebextensions/01-env-vars.config
commands:
  01_fetch_ssm_secrets:
    command: |
      #!/bin/bash
      set -e

      # Fetch secrets from SSM Parameter Store
      DB_PASSWORD=$(aws ssm get-parameter \
        --name "/treasury-plane/dev/db-password" \
        --with-decryption \
        --region us-gov-west-1 \
        --query 'Parameter.Value' \
        --output text)

      SECRET_KEY=$(aws ssm get-parameter \
        --name "/treasury-plane/dev/django-secret-key" \
        --with-decryption \
        --region us-gov-west-1 \
        --query 'Parameter.Value' \
        --output text)

      # Write to file that will be sourced by EB
      cat > /opt/elasticbeanstalk/deployment/custom_env <<EOF
      export DATABASE_PASSWORD="${DB_PASSWORD}"
      export SECRET_KEY="${SECRET_KEY}"
      EOF

      # Make readable by EB processes
      chmod 644 /opt/elasticbeanstalk/deployment/custom_env
```

**Important:** This runs **before** Django starts, ensuring secrets are available.

#### Fix 3: Handle Special Characters in Passwords

If password contains shell special characters (`$`, `!`, `\`, etc.), use proper escaping:

```bash
# WRONG - breaks with special characters
export DB_PASSWORD=$(aws ssm get-parameter --name "/path" --query 'Parameter.Value' --output text)

# CORRECT - safely handles all characters
DB_PASSWORD=$(aws ssm get-parameter \
  --name "/path" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text | sed 's/\\/\\\\/g; s/"/\\"/g')

export DATABASE_URL="postgresql://user:${DB_PASSWORD}@host:5432/dbname"
```

See related doc: `/Users/corcoss/code/plane/docs/solutions/eb-deployment/secrets-management-shell-escaping.md`

#### Fix 4: Add VPC Endpoint for SSM (If in Private Subnets)

If EB instances are in private subnets without NAT gateway:

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
  description = "Allow HTTPS from EB instances to VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eb_instance.id]
  }
}
```

### Prevention Checklist

Before deploying to new EB environment:

- [ ] Verify IAM instance profile has `ssm:GetParameter` permission
- [ ] Test SSM parameter access from EC2 instance in same VPC
- [ ] Add VPC endpoints for SSM if using private subnets
- [ ] Fetch secrets in `.ebextensions` commands (before container_commands)
- [ ] Test with passwords containing special characters (`$`, `!`, `\`)
- [ ] Add logging to `.ebextensions` to verify secrets are fetched
- [ ] Check `/var/log/eb-engine.log` for SSM errors after deployment

**Testing after deployment:**

```bash
# SSH to new instance
aws ssm start-session --target $INSTANCE_ID

# Verify secrets are available
env | grep DATABASE
source /opt/elasticbeanstalk/deployment/custom_env
echo $DATABASE_PASSWORD | wc -c  # Should match actual password length

# Test database connection
psql "postgresql://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:5432/$DATABASE_NAME" -c "SELECT version();"
```

---

## Issue 4: CloudFront Custom Error Responses Break API Routes

### Symptom

API requests to `/api/health`, `/api/users`, etc. return **HTML from frontend SPA** instead of JSON:

```bash
curl https://example.com/api/health
# Returns: <html><body>...</body></html> (frontend app)
# Expected: {"status": "OK"}
```

### Root Cause

CloudFront `custom_error_response` redirects 403/404 errors to `/index.html` to support SPA client-side routing. However, this catches **all** 403/404 responses, including legitimate API 404s.

**What happens:**

1. Request hits `/api/nonexistent-endpoint`
2. API returns 404 (no such endpoint)
3. CloudFront sees 404, triggers custom error response
4. CloudFront serves `/index.html` from S3 origin instead
5. Client receives HTML (200 status) instead of JSON (404 status)

**Configuration that causes this:**

```terraform
# BAD - Applies to ALL origins, including API
resource "aws_cloudfront_distribution" "unified" {
  # ...

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"  # Serves SPA for ANY 404
    error_caching_min_ttl = 0
  }

  # Applies to both S3 (frontend) AND ALB (API) origins!
}
```

### Solution

#### Option 1: Remove Custom Error Responses (Simplest)

If API routes are under `/api/*` and frontend is at `/`, remove custom error responses entirely:

```terraform
# terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "unified" {
  # ...

  # NO custom_error_response blocks at all
  # Let API return real 404s, SPA handles client-side routing
}
```

**How this works:**

- API 404s return real 404 JSON responses
- Frontend handles routing client-side (React Router catches non-existent routes)
- If user directly accesses `/nonexistent`, they get S3 404 (acceptable for SPAs)

#### Option 2: Use Lambda@Edge to Conditionally Serve Error Page

For complex scenarios where you need custom error handling for frontend but not API:

```javascript
// lambda-edge/origin-response.js
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;

  // Only apply custom error handling to non-API routes
  if (request.uri.startsWith('/api/')) {
    return response;  // Pass through API errors unchanged
  }

  // For frontend routes, serve index.html on 404
  if (response.status === '404' || response.status === '403') {
    // Fetch /index.html from S3
    response.status = '200';
    response.statusDescription = 'OK';
    response.body = await fetchIndexFromS3();
  }

  return response;
};
```

**Terraform configuration:**

```terraform
resource "aws_cloudfront_distribution" "unified" {
  # ...

  default_cache_behavior {
    # ...
    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = aws_lambda_function.error_handler.qualified_arn
    }
  }
}
```

#### Option 3: Separate CloudFront Distributions (Fallback)

If single-domain routing is too complex, use separate distributions:

```terraform
# Frontend distribution (with error responses)
resource "aws_cloudfront_distribution" "frontend" {
  # ... S3 origin ...

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
}

# API distribution (no error responses)
resource "aws_cloudfront_distribution" "api" {
  # ... ALB origin ...
  # NO custom_error_response blocks
}
```

Use DNS CNAME records to route:
- `app.example.com` → Frontend distribution
- `api.example.com` → API distribution

### Prevention Checklist

When using path-based routing with CloudFront:

- [ ] Test API 404 responses: `curl -v https://example.com/api/nonexistent`
- [ ] Verify response is JSON, not HTML
- [ ] Check response status is 404, not 200
- [ ] Remove `custom_error_response` if using path-based routing to API
- [ ] Use Lambda@Edge if you need conditional error handling
- [ ] Consider separate distributions if routing becomes too complex

---

## Issue 5: Corporate Firewall Blocks Non-Standard Ports

### Symptom

Testing ALB directly from corporate network returns:

```bash
curl http://treasury-plane-alb-123456789.us-gov-west-1.elb.amazonaws.com:8080/health

# Returns 504 after timeout, HTML contains:
<title>Zscaler | Web Gateway</title>
```

**This indicates:** Corporate firewall (Zscaler) is blocking HTTP on non-standard ports.

### Root Cause

Government and corporate networks often enforce web proxy policies:

- **Port 80 (HTTP)**: Usually allowed
- **Port 443 (HTTPS)**: Usually allowed
- **Ports 8080, 3000, 8000, etc.**: Often blocked by proxy

Zscaler, Palo Alto, or similar enterprise proxies intercept traffic on non-standard ports and return 504/502 errors.

### Solution

#### Use Standard Ports for ALB

```terraform
# terraform/alb.tf
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80   # NOT 8080
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
```

#### Update Security Groups

```terraform
# terraform/security-groups.tf
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb"
  description = "Allow HTTP/HTTPS to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS from anywhere"
  }

  # Remove any rules for 8080, 8443, etc.
}
```

### Testing from Corporate Network

```bash
# Test from corporate laptop (behind Zscaler/proxy)
curl -v https://treasury-plane-alb.us-gov-west-1.elb.amazonaws.com/health

# Should work on port 443
# If you see "Zscaler" or 504, port is blocked

# Test with CloudFront (always works, uses 443)
curl -v https://example.com/api/health
```

### Prevention Checklist

When deploying to AWS for government/corporate access:

- [ ] Always use port 443 for HTTPS (not 8443, 8080, etc.)
- [ ] Always use port 80 for HTTP (redirect to 443)
- [ ] Test from actual corporate network before considering deployment complete
- [ ] Document any corporate proxy/VPN requirements in README
- [ ] Use CloudFront for production traffic (handles all ports correctly)

---

## Deployment Workflow: Complete Checklist

Use this checklist when deploying new infrastructure with CloudFront + EB + ALB:

### Pre-Deployment

- [ ] Decide: Terraform-managed ALB or EB-managed ALB?
- [ ] If Terraform ALB: Set `LoadBalancerIsShared = true` in EB config
- [ ] If EB ALB: Reference EB's ALB domain in CloudFront origin
- [ ] Store database credentials in SSM Parameter Store
- [ ] Verify IAM instance profile has `ssm:GetParameter` permission
- [ ] Add VPC endpoints for SSM if using private subnets
- [ ] Configure ALB to use ports 80/443 (not 8080/8443)
- [ ] Remove CloudFront `custom_error_response` if using path-based API routing

### Post-Deployment Verification

```bash
# 1. Check ALB listeners exist and are enabled
ALB_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name treasury-plane-dev \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text | xargs -I {} aws elbv2 describe-load-balancers \
  --names {} --query 'LoadBalancers[0].LoadBalancerArn' --output text)

aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN
# Should show listeners on ports 80 and/or 443

# 2. Check target group health
TG_ARN=$(aws elbv2 describe-target-groups --load-balancer-arn $ALB_ARN \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 describe-target-health --target-group-arn $TG_ARN
# All instances should be "healthy"

# 3. Test ALB directly (from AWS Cloud9 or home network, not corporate)
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' --output text)

curl http://$ALB_DNS/health
# Should return JSON {"status": "OK"}

# 4. Test CloudFront (works from corporate network)
curl https://example.com/api/health
# Should return JSON, not HTML

# 5. Verify SSM secrets on new instance
aws ssm start-session --target $INSTANCE_ID
env | grep DATABASE
# Should show actual password, not placeholder

# 6. Test database connection from instance
psql "postgresql://$DATABASE_USER:$DATABASE_PASSWORD@$DATABASE_HOST:5432/$DATABASE_NAME" -c "SELECT 1;"
# Should connect successfully
```

### Troubleshooting Decision Tree

```
504 from CloudFront?
├─ Yes → Check ALB listeners exist: aws elbv2 describe-listeners
│  ├─ Empty listeners → Enable default listener in EB config
│  └─ Listeners exist → Check target group health
│     ├─ Unhealthy → Check EB application version
│     └─ Healthy → Check CloudFront origin config
│
API returns HTML instead of JSON?
├─ Yes → Remove custom_error_response from CloudFront
│
New EB instances fail database auth?
├─ Yes → Check IAM permissions for ssm:GetParameter
│  └─ Permissions OK → Verify SSM parameters exist
│     └─ Parameters exist → Check VPC endpoints for SSM
│
curl from corporate network fails with Zscaler error?
└─ Yes → Change ALB to use port 443, not 8080
```

---

## Files Modified

- `terraform/cloudfront.tf` - Origin configuration, removed custom error responses
- `terraform/alb.tf` - Listener configuration, ports 80/443
- `terraform/eb-environment.tf` - Listener enabled, IAM instance profile
- `terraform/iam.tf` - SSM parameter permissions
- `apps/api/.ebextensions/01-env-vars.config` - SSM secret fetching

---

## Related Documentation

- [AWS ALB Listener Configuration](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html)
- [Elastic Beanstalk Shared Load Balancer](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-alb-shared.html)
- [SSM Parameter Store IAM Permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html)
- [CloudFront Custom Error Pages](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html)

## See Also

- `/Users/corcoss/code/plane/docs/solutions/infrastructure-issues/cloudfront-cache-policy-and-eb-migration-failures.md` - Cache policy patterns, migration timeouts
- `/Users/corcoss/code/plane/docs/solutions/infrastructure-issues/cloudfront-eb-alb-deployment-patterns.md` - SPA routing, Terraform state drift
- `/Users/corcoss/code/plane/docs/solutions/eb-deployment/secrets-management-shell-escaping.md` - Shell escaping for SSM passwords
