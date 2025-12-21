---
problem_type: infrastructure-deployment
component: aws-cloudfront-eb-alb
symptoms:
  - "CloudFront returning wrong index.html for SPA with subpath basename"
  - "Terraform repeatedly trying to recreate EB environment"
  - "ALB target group showing unhealthy despite EB Green health"
tags:
  - cloudfront
  - elastic-beanstalk
  - alb
  - terraform
  - spa
  - health-checks
  - state-drift
related_components:
  - aws-cloudfront
  - aws-elastic-beanstalk
  - aws-alb
  - terraform-lifecycle
  - react-spa
date_solved: 2025-12-21
---

# CloudFront, Elastic Beanstalk, and ALB Deployment Patterns

This document covers three interconnected AWS deployment issues encountered while deploying Treasury Plane (Django backend + React frontends).

## Issue 1: CloudFront SPA Error Responses with Subpath Basename

### Symptom

Admin app at `/god-mode/` path returns 404 errors on client-side routes. Refreshing any SPA route shows the root redirect HTML instead of the admin app.

### Root Cause

CloudFront `custom_error_response` was configured with `response_page_path = "/index.html"` but the admin app's entry point is at `/god-mode/index.html`.

When React Router navigates client-side, the path `/god-mode/settings` doesn't exist in S3, so CloudFront returns a 404. The error response was serving the wrong index.html.

### Solution

Update CloudFront error responses to match the app's basename:

```terraform
# terraform/cloudfront.tf
resource "aws_cloudfront_distribution" "admin" {
  # ... other config ...

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/god-mode/index.html"  # Match app basename
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/god-mode/index.html"  # Match app basename
    error_caching_min_ttl = 0
  }
}
```

### Prevention

**Checklist before deploying SPA to CloudFront:**

- [ ] Check React Router basename in app config (e.g., `react-router.config.ts`)
- [ ] Verify S3 bucket structure matches (files at `/god-mode/index.html`)
- [ ] Set `response_page_path` to `/{basename}/index.html`
- [ ] Invalidate CloudFront cache after changes

**Verification:**

```bash
# Test error handling returns correct content
curl -s https://admin.example.com/god-mode/nonexistent-route | grep -o "god-mode"
# Should find "god-mode" in the response (from the admin app's index.html)
```

---

## Issue 2: Terraform Elastic Beanstalk State Drift

### Symptom

`terraform apply` repeatedly tries to recreate the EB environment even without code changes. Error: "Environment update completed successfully, but with errors."

### Root Cause

Elastic Beanstalk modifies environment settings after creation (platform updates, auto-scaling triggers, enhanced health reporting). Terraform detects these AWS-managed changes as drift and attempts to "fix" them by recreating the environment.

Additionally, AWS returns subnet IDs in non-deterministic order, causing spurious diff detection.

### Solution

Add lifecycle `ignore_changes` to prevent Terraform from managing EB-controlled settings:

```terraform
# terraform/eb-environment.tf
resource "aws_elastic_beanstalk_environment" "main" {
  name                = "${var.project_name}-${var.environment}"
  application         = aws_elastic_beanstalk_application.main.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.9.0 running Python 3.11"

  # ... all settings ...

  lifecycle {
    ignore_changes = [
      all_settings,
      setting,
    ]
  }
}
```

**If environment is already tainted:**

```bash
# Remove taint to prevent destruction
terraform untaint aws_elastic_beanstalk_environment.main

# Verify plan shows no destructive changes
terraform plan
```

### Prevention

**Best practices for EB + Terraform:**

1. Use Terraform for infrastructure creation, EB CLI for app deployments
2. Add `lifecycle.ignore_changes` for settings EB manages automatically
3. Never use `terraform taint` on EB environments in production
4. Run `terraform plan` before `apply` to catch unexpected recreations

---

## Issue 3: ALB Target Group Health Check Failures

### Symptom

Custom ALB target group shows instances as "unhealthy" even though EB environment health is Green.

### Root Cause

EB environment was running a placeholder application version (v1) instead of the actual application code (v9). The health check endpoint (`/`) returned 200 from the placeholder but the application logic was missing.

### Diagnosis

```bash
# Check current EB version
aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query 'Environments[0].VersionLabel' \
  --output text

# Check target group health with details
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,State:TargetHealth.State,Reason:TargetHealth.Reason}'
```

### Solution

Update EB environment to the correct application version:

```bash
# Update to correct version
aws elasticbeanstalk update-environment \
  --environment-name treasury-plane-dev \
  --version-label treasury-plane-v9

# Monitor deployment
aws elasticbeanstalk describe-environments \
  --environment-names treasury-plane-dev \
  --query 'Environments[0].[Status,Health,HealthStatus]'
```

### Prevention

**Deployment verification checklist:**

- [ ] Verify EB version label matches expected deployment
- [ ] Check target group health shows all instances healthy
- [ ] Test actual API endpoint (not just health check path)
- [ ] Monitor for 5xx errors after deployment

**Health endpoint best practice:**

```python
# Return version in health check response
def health_check(request):
    return JsonResponse({
        "status": "OK",
        "version": os.environ.get("APP_VERSION", "unknown"),
        "timestamp": timezone.now().isoformat()
    })
```

---

## Quick Reference

| Issue                   | Key Fix                                                      | Verification                                     |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| CloudFront SPA basename | Set `response_page_path` to `/{basename}/index.html`         | `curl -I $URL/nonexistent` returns 200           |
| Terraform EB drift      | Add `lifecycle { ignore_changes = [all_settings, setting] }` | `terraform plan` shows no changes                |
| ALB health vs EB health | Update EB to correct version label                           | `aws elbv2 describe-target-health` shows healthy |

## Files Modified

- `terraform/cloudfront.tf` (lines 108-120) - Admin error response paths
- `terraform/eb-environment.tf` (lines 263-268) - Lifecycle ignore_changes

## Related Documentation

- [AWS CloudFront Custom Error Responses](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html)
- [Terraform EB Lifecycle Management](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elastic_beanstalk_environment#lifecycle-configuration)
- [ALB Health Check Configuration](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
