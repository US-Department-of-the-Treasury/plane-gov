---
title: "Remove External Data Exfiltration Vectors from Government Plane Fork"
category: security-issues
tags:
  - security
  - data-exfiltration
  - government-deployment
  - telemetry
  - tracking
  - privacy
  - hardening
  - sentry
  - clarity
  - unsplash
  - cdn
severity: critical
date_solved: 2025-12-20
symptoms:
  - Sentry error reporting transmitting stack traces externally
  - Microsoft Clarity session recorder capturing all user interactions
  - External CDN loads (jsdelivr) creating tracking/supply chain risks
  - Unsplash API calls exposing user behavior and IP addresses
affected_components:
  - Error reporting (Sentry integration)
  - Session recording (Microsoft Clarity)
  - Frontend components (ImagePickerPopover, entry points)
  - Backend API endpoints (UnsplashEndpoint)
  - Editor extensions (callout emoji URL)
  - Django templates (base.html CDN scripts)
related_commits:
  - cc125dc7f0 (sec: Remove all external data exfiltration vectors)
  - 501a886ac6 (sec: Remove all external network calls)
related_pr:
  - https://github.com/US-Department-of-the-Treasury/plane-treasury/pull/19
---

# Remove External Data Exfiltration Vectors for Government Deployment

## Problem

The Plane application contains multiple features that make automatic external network calls, creating data exfiltration vectors unacceptable for government deployment:

1. **Sentry Error Reporting** - Sends errors, stack traces, and request data to sentry.io
2. **Microsoft Clarity** - Records complete user sessions (clicks, inputs, navigation) to Microsoft
3. **External CDN Dependencies** - Loads resources from jsdelivr.net (tracking, supply chain risk)
4. **Unsplash Integration** - Makes API calls to unsplash.com when searching images

For government deployment, **any automatic external network call is a potential data exfiltration vector**.

## Root Cause

These features were designed for commercial SaaS deployment with built-in analytics and marketing integrations. They serve legitimate purposes in that context but are security risks for self-hosted government deployments where:

- Data sovereignty requires data never leave government infrastructure
- Supply chain security means external CDNs are potential attack vectors
- PII protection means error reports (which often contain PII) cannot go external
- Zero trust architecture assumes hostile network environment

## Solution

### 1. Sentry Error Reporting (5 files)

**Entry points** (`apps/web/app/entry.client.tsx`, `apps/admin/app/entry.client.tsx`, `apps/space/app/entry.client.tsx`):

```typescript
// Before: Full Sentry initialization with DSN, tracing, replays
import * as Sentry from "@sentry/react-router";
Sentry.init({ dsn: process.env.VITE_SENTRY_DSN, ... });

// After: Completely removed
// Sentry disabled for government deployment - no external error reporting
import { startTransition, StrictMode } from "react";
// ... standard React hydration only
```

**Backend** (`apps/live/src/instrument.ts`):

```typescript
// Before: Node.js Sentry with profiling
export const setupSentry = () => {
  Sentry.init({ dsn: process.env.SENTRY_DSN, ... });
};

// After: No-op stub
export const setupSentry = () => {
  // No-op: Sentry disabled for government deployment
};
```

**Error handler** (`apps/web/app/root.tsx`):

```typescript
// Before
Sentry.captureException(error);

// After
console.error("Application error:", error);
```

### 2. Microsoft Clarity (1 file)

**File**: `apps/web/app/root.tsx`

```typescript
// Before: Clarity script injection
{
  !!isSessionRecorderEnabled && process.env.VITE_SESSION_RECORDER_KEY && (
    <Script id="clarity-tracking">
      {`(function(c,l,a,r,i,t,y){...})(window, document, "clarity", "script", "${process.env.VITE_SESSION_RECORDER_KEY}");`}
    </Script>
  );
}

// After: Completely removed
// Microsoft Clarity session recorder removed for government deployment
```

### 3. External CDN Dependencies (2 files)

**Emoji CDN** (`packages/editor/src/core/extensions/callout/utils.ts`):

```typescript
// Before
[ECalloutAttributeNames.EMOJI_URL]: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4a1.png",

// After
// External CDN URL removed for government deployment - using icon fallback
[ECalloutAttributeNames.EMOJI_URL]: undefined,
```

**Unused template** (`apps/api/templates/base.html`): **Deleted entirely** - contained jQuery, Bootstrap, Popper.js CDN scripts.

### 4. Unsplash Integration (8 files)

**API endpoint removed** (`apps/api/plane/app/views/external/base.py`):

```python
# Before: Full UnsplashEndpoint class making requests to api.unsplash.com
# After: Comment noting removal
# Unsplash integration removed for government deployment - no external API calls
```

**URL route removed** (`apps/api/plane/app/urls/external.py`):

```python
# Removed: path("unsplash/", UnsplashEndpoint.as_view(), name="unsplash"),
```

**Config cleared** (`apps/api/plane/utils/instance_config_variables/core.py`):

```python
# Before: unsplash_config_variables = [{ "key": "UNSPLASH_ACCESS_KEY", ... }]
# After: unsplash_config_variables = []
```

**Frontend service** (`apps/web/core/services/file.service.ts`):

- Removed `UnSplashImage` and `UnSplashImageUrls` interfaces
- Removed `getUnsplashImages()` method

**Image picker** (`apps/web/core/components/core/image-picker-popover.tsx`):

- Removed Unsplash tab from tab options
- Removed search functionality and SWR data fetching
- Removed `control` prop (was for search form)
- Kept static images and upload tabs

**Component consumers** (3 files):

- `apps/web/core/components/project/form.tsx`
- `apps/web/core/components/project/create/header.tsx`
- `apps/web/core/components/profile/form.tsx`
- Removed unused `control` prop from ImagePickerPopover usage

## What Was Preserved

- **Static cover images** - Bundled with app, no external calls
- **File upload** - Users can upload custom images to configured storage
- **OAuth providers** - User-configured, explicit admin setup required
- **Webhooks** - User-specified endpoints, intentional external calls
- **LLM integration** - Requires explicit configuration

## Verification

```bash
# Check for Sentry references
grep -r "Sentry\|@sentry" apps/ --include="*.tsx" --include="*.ts" | grep -v "disabled"

# Check for Clarity references
grep -r "clarity.ms\|SESSION_RECORDER" apps/

# Check for Unsplash references
grep -r "unsplash\|UNSPLASH" apps/ --include="*.py" --include="*.ts" --include="*.tsx"

# Check for jsdelivr CDN
grep -r "jsdelivr.net" packages/ apps/

# Network verification (run in isolated environment)
# Monitor with tcpdump/Wireshark - should see ZERO connections to:
# - sentry.io, clarity.ms, unsplash.com, jsdelivr.net
```

## Prevention

See `docs/solutions/security/external-data-exfiltration-prevention.md` for:

- Automated security audit script
- CI/CD workflow to block external calls in PRs
- Pre-commit hook template
- External calls allowlist configuration
- Fork maintenance best practices

## Files Modified

| Category  | Files  | Change                                       |
| --------- | ------ | -------------------------------------------- |
| Sentry    | 5      | Stubbed/removed initialization and capture   |
| Clarity   | 1      | Removed tracking script                      |
| CDN       | 2      | Removed URL, deleted unused template         |
| Unsplash  | 8      | Removed endpoint, service, component, config |
| **Total** | **16** | **258 lines removed, 26 added**              |

## Related Documentation

- `plans/remove-marketing-content-for-gov-deployment.md` - Full security audit plan
- `TREASURY.md` - Treasury fork setup and configuration
- `FORK-DIFFERENCES.md` - Tracking divergence from upstream
- `config/external-calls-allowlist.yml` - Approved external calls
