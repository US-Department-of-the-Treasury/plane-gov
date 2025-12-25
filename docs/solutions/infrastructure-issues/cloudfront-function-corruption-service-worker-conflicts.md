---
title: "CloudFront Function Corruption and Service Worker Caching Conflicts"
slug: cloudfront-function-corruption-service-worker-conflicts
category: infrastructure-issues
components:
  - cloudfront
  - service-worker
  - terraform
  - react-router
symptoms:
  - "CloudFront 503 ERROR: 'The CloudFront function associated with the CloudFront distribution is invalid or could not run'"
  - 'React Router error: ''<Router basename="/god-mode/"> can''t match URL "/"'''
  - "CloudFront function code appears as binary garbage"
  - "Wrong app loads when navigating between / and /god-mode/"
root_causes:
  - "Terraform heredoc encoding corruption during terraform apply"
  - "Service worker caches wrong content when multiple apps share same origin"
severity: high
date_documented: 2025-12-24
tags:
  - cloudfront
  - service-worker
  - terraform
  - caching
  - multi-app-deployment
  - react-router
---

# CloudFront Function Corruption and Service Worker Caching Conflicts

## Overview

Two critical problems that can occur when deploying multiple React apps (web, admin, space) on a single domain with CloudFront:

1. **CloudFront Function Corruption** - Terraform heredocs become corrupted during deployment
2. **Service Worker Caching Conflicts** - Wrong JavaScript loads when switching between apps

## Problem 1: CloudFront Function Corruption

### Symptoms

- 503 ERROR from CloudFront
- Error message: "The CloudFront function associated with the CloudFront distribution is invalid or could not run"
- Testing function shows: "Invalid function code at byte 1"
- Function code appears as binary garbage in AWS console

### Root Cause

Terraform heredocs (`<<-EOF ... EOF`) can become corrupted during `terraform apply` due to encoding issues. The JavaScript code gets transformed into binary data.

### Solution

**Move CloudFront functions to external files:**

Create `terraform/cloudfront-functions/web-spa-routing.js`:

```javascript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Redirect /god-mode to /god-mode/
  if (uri === "/god-mode") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "/god-mode/" } },
    };
  }

  // Redirect /spaces to /spaces/
  if (uri === "/spaces") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "/spaces/" } },
    };
  }

  // SPA routing: if no extension, serve index.html
  if (!uri.includes(".")) {
    request.uri = "/index.html";
  }

  return request;
}
```

**Update Terraform to use file():**

```hcl
# BEFORE (prone to corruption):
resource "aws_cloudfront_function" "web_spa_routing" {
  code = <<-EOF
    function handler(event) { ... }
  EOF
}

# AFTER (corruption-proof):
resource "aws_cloudfront_function" "web_spa_routing" {
  code = file("${path.module}/cloudfront-functions/web-spa-routing.js")
}
```

**Add post-deployment validation:**

```hcl
resource "null_resource" "validate_cloudfront_functions" {
  triggers = {
    web_spa_routing_etag = aws_cloudfront_function.web_spa_routing.etag
  }

  provisioner "local-exec" {
    command = <<-EOF
      set -e
      ETAG=$(aws cloudfront describe-function --name ${aws_cloudfront_function.web_spa_routing.name} --stage LIVE --query 'ETag' --output text)
      RESULT=$(aws cloudfront test-function \
        --name ${aws_cloudfront_function.web_spa_routing.name} \
        --stage LIVE \
        --if-match "$ETAG" \
        --event-object "$(echo '{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/test","querystring":{},"headers":{}}}' | base64)" \
        --query 'TestResult.FunctionErrorMessage' --output text 2>&1)
      if [ "$RESULT" != "None" ] && [ -n "$RESULT" ]; then
        echo "ERROR: Function validation failed: $RESULT"
        exit 1
      fi
      echo "Function validated successfully"
    EOF
  }
}
```

## Problem 2: Service Worker Caching Conflicts

### Symptoms

- After visiting `/god-mode/`, navigating to `/` shows wrong app
- Console error: `<Router basename="/god-mode/"> is not able to match the URL "/"`
- Hard refresh temporarily fixes it
- Works in incognito but not normal browsing

### Root Cause

Service workers operate at the **origin level** (domain), not path level. When multiple apps share the same domain:

- Web app registers service worker at `plane.example.gov/sw.js`
- User visits `/god-mode/` (admin app)
- Service worker caches admin app content in "start-url" cache
- User returns to `/` - service worker serves cached admin content
- Wrong React Router basename causes app to break

### Solution

**Remove service worker for multi-app single-domain deployments:**

```bash
# Remove from source
rm apps/web/public/sw.js
rm apps/web/public/sw.js.map
rm apps/web/public/workbox-*.js

# Remove from S3
aws s3 rm s3://your-bucket/sw.js
aws s3 rm s3://your-bucket/sw.js.map
aws s3 rm s3://your-bucket/workbox-*.js

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**User browser cleanup instructions:**

1. Open DevTools → Application tab
2. Service Workers → Click "Unregister"
3. Storage → Click "Clear site data"
4. Close tab and reopen

## Prevention Checklist

### CloudFront Functions

- [ ] Always use external `.js` files, never heredocs
- [ ] Add `null_resource` validation after deployment
- [ ] Test functions manually after Terraform changes
- [ ] Monitor CloudFront error rates after deployments

### Service Workers

- [ ] Don't use service workers for multi-app single-domain setups
- [ ] If SW required, use separate subdomains per app
- [ ] Or scope service workers carefully: `{ scope: '/specific-app/' }`
- [ ] Document the trade-off (offline support vs multi-app conflicts)

## Architecture Decision

**Why separate sessions for admin vs web?**

The Django backend intentionally uses separate session cookies:

- `session-id` - Web app (7 day expiration)
- `admin-session-id` - Admin app (1 hour expiration)

This is a security feature - admin sessions should be shorter-lived. Users logging in separately to each app is expected behavior.

## Related Files

- `terraform/cloudfront.tf` - CloudFront distribution config
- `terraform/cloudfront-functions/*.js` - External function files
- `apps/web/public/sw.js` - Service worker (removed)
- `apps/api/plane/settings/common.py` - Session cookie settings

## Commits

- `98e155673` - fix(terraform): prevent CloudFront function encoding corruption
- `8e5c6707e` - fix(web): remove service worker to prevent caching conflicts
