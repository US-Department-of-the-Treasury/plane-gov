---
title: CloudFront Missing /auth/* Route Causes 403 on POST Requests
category: infrastructure-issues
tags:
  - cloudfront
  - routing
  - auth
  - terraform
  - 403-forbidden
  - django
severity: high
symptoms:
  - 403 Forbidden on POST to /auth/email-check/
  - Sign-up form submission fails silently
  - Auth endpoints return 403 while /api/* endpoints work fine
root_cause: CloudFront default behavior routes to S3, which only allows GET/HEAD requests
date_solved: 2025-12-23
---

# CloudFront Missing /auth/\* Route Causes 403 on POST Requests

## Problem

When users try to sign up, they receive a `403 Forbidden` error on POST requests to `/auth/email-check/`. The Django API health endpoints (`/api/*`) work fine, but authentication endpoints fail.

## Symptoms

- Sign-up form shows network error or 403 in browser console
- `curl -X POST https://plane.example.gov/auth/email-check/` returns 403
- `/api/instances/` and other API endpoints work correctly
- No errors in Django logs (request never reaches backend)

## Investigation

### Initial Hypothesis: Django CSRF or Permissions

First thought was Django-side issue (CSRF, permissions, authentication middleware). However:

- No Django logs showed the request
- Same endpoint worked locally

### Key Discovery: Auth Endpoints Are at /auth/_, Not /api/auth/_

Checking `apps/api/plane/urls.py`:

```python
path("auth/", include("plane.authentication.urls")),  # /auth/*
path("api/", include("plane.urls.api_routes")),       # /api/*
```

Auth endpoints live at `/auth/*`, completely separate from `/api/*`.

### Root Cause: CloudFront Routing

CloudFront had ordered cache behaviors for:

- `/api/*` → ALB (backend)
- `/live/*` → ALB (websocket)
- `/god-mode/*` → S3 (admin app)
- `/spaces/*` → S3 (space app)
- Default → S3 (web app)

**Missing:** `/auth/*` behavior!

Requests to `/auth/*` fell through to the default S3 behavior. S3 only supports GET/HEAD methods, so POST requests returned 403 Forbidden.

## Solution

Added `/auth/*` behavior to `terraform/cloudfront.tf`:

```terraform
# /auth/* → ALB (authentication endpoints, no caching)
ordered_cache_behavior {
  path_pattern           = "/auth/*"
  allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
  cached_methods         = ["GET", "HEAD"]
  target_origin_id       = "ALB-api"
  viewer_protocol_policy = "redirect-to-https"
  compress               = true

  cache_policy_id          = local.managed_cache_policy_caching_disabled
  origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

  response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
}
```

Applied with:

```bash
cd terraform
terraform plan
terraform apply
```

CloudFront distribution update takes ~3-5 minutes.

## Verification

```bash
curl -s "https://plane.example.gov/auth/email-check/" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@treasury.gov"}'

# Expected: {"existing":false,"status":"CREDENTIAL"} with 200 OK
```

## Prevention

### Deployment Checklist

When adding new Django URL paths that need POST/PUT/DELETE:

1. Check `apps/api/plane/urls.py` for URL prefix
2. Verify CloudFront has a behavior for that prefix
3. If not, add behavior in `terraform/cloudfront.tf`
4. Run `terraform apply` before testing

### Quick Reference: CloudFront Behavior Requirements

| URL Pattern   | Origin | Methods Needed               |
| ------------- | ------ | ---------------------------- |
| `/api/*`      | ALB    | All HTTP methods             |
| `/auth/*`     | ALB    | All HTTP methods             |
| `/live/*`     | ALB    | All HTTP methods (WebSocket) |
| `/god-mode/*` | S3     | GET/HEAD only                |
| `/spaces/*`   | S3     | GET/HEAD only                |
| Default       | S3     | GET/HEAD only                |

### Diagnostic Commands

```bash
# Test if endpoint is reaching backend (should return JSON, not 403/HTML)
curl -s -X POST "https://your-domain/auth/email-check/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | head -c 200

# Check CloudFront distribution behaviors
aws cloudfront get-distribution --id YOUR_DIST_ID \
  --query 'Distribution.DistributionConfig.CacheBehaviors.Items[*].PathPattern'
```

## Related Issues

- Double `/api/api/` URL: Fixed by updating `NEXT_PUBLIC_API_BASE_URL` in frontend deploy script
- EB not picking up secrets: See `eb-secrets-require-redeploy.md`

## Files Changed

- `terraform/cloudfront.tf` - Added `/auth/*` ordered_cache_behavior
