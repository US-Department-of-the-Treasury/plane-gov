# Government Fork Differences from Upstream

This document tracks intentional differences between this government fork and the upstream `makeplane/plane` repository.

**Last Updated:** 2025-12-20
**Upstream Version:** Based on commit `ca5cae4` (December 2025)
**Fork Maintainer:** US Department of the Treasury

---

## Purpose

This fork removes ALL external data transmission to comply with government security requirements. No data may leave the security boundary without explicit approval.

---

## Security Modifications

### Removed Services

| Service                  | Purpose (Upstream)           | Removal Status | PR  |
| ------------------------ | ---------------------------- | -------------- | --- |
| **Sentry**               | Error reporting to sentry.io | ✅ Removed     | #14 |
| **PostHog**              | Product analytics            | ✅ Removed     | #14 |
| **Microsoft Clarity**    | Session recording            | ✅ Removed     | #14 |
| **Intercom**             | Customer support chat        | ⏳ In Progress | #22 |
| **Unsplash API**         | External image search        | ✅ Stubbed     | #18 |
| **Telemetry (plane.so)** | Usage metrics to vendor      | ⏳ In Progress | #23 |
| **Social Media Links**   | Twitter, Discord, LinkedIn   | ⏳ In Progress | #24 |

**Explanation:**

- ✅ Removed: Completely removed from codebase
- ✅ Stubbed: Function signatures remain but return no-ops
- ⏳ In Progress: Currently being removed

### Modified Behavior

#### 1. Error Tracking (Sentry)

**Upstream Behavior:**

```typescript
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_SENTRY_ENVIRONMENT,
});
```

**Fork Behavior:**

```typescript
// Sentry disabled for government deployment - no external error reporting
// Errors are logged to console for local debugging
if (error) {
  console.error("Application error:", error);
}
```

#### 2. Analytics (PostHog)

**Upstream Behavior:**

```typescript
posthog.capture("user_signed_in", { user_id, workspace_id });
```

**Fork Behavior:**

```typescript
// File: apps/web/core/helpers/event-tracker.helper.ts
export const captureEvent = (eventName: string, payload: any) => {
  // No-op for government deployment
  return Promise.resolve();
};
```

#### 3. Session Recording (Microsoft Clarity)

**Upstream Behavior:**

```html
<script>
  window.clarity("init", process.env.CLARITY_PROJECT_ID);
</script>
```

**Fork Behavior:**

```typescript
// File: apps/web/app/root.tsx
// Microsoft Clarity session recorder removed for government deployment - no external session tracking
```

#### 4. Email Templates

**Upstream Behavior:**

```html
<img src="https://media.docs.plane.so/logo/new-logo-white.png" />
<a href="https://twitter.com/planepowers">Follow us</a>
```

**Fork Behavior:**

- Logo: Inline base64 or local asset
- Social links: Removed entirely
- External CDN references: Replaced with local assets

#### 5. Unsplash Integration

**Upstream Behavior:**

```typescript
const searchUnsplash = async (query: string) => {
  return axios.get(`https://api.unsplash.com/search/photos?query=${query}`);
};
```

**Fork Behavior:**

```typescript
// File: apps/web/core/services/file.service.ts
// Unsplash integration removed for government deployment - no external API calls
```

#### 6. OAuth Providers

**Upstream Default:**

- Google OAuth
- GitHub OAuth
- GitLab OAuth
- Gitea OAuth

**Fork Default:**

- Login.gov (IAL2 for federal employees)
- Azure AD Government (for DoD/IC)
- Google OAuth (disabled by default)
- GitHub OAuth (disabled by default)

#### 7. Telemetry Background Tasks

**Upstream Behavior:**

```python
# File: apps/api/plane/celery.py
"run-every-6-hours-for-instance-trace": {
    "task": "plane.license.bgtasks.tracer.instance_traces",
    "schedule": crontab(hour="*/6", minute=0),
}
```

**Fork Behavior:**

```python
# Telemetry task removed - no data sent to plane.so
```

---

## Configuration Defaults Changed

| Variable                | Upstream Default | Fork Default | Reason                     |
| ----------------------- | ---------------- | ------------ | -------------------------- |
| `IS_INTERCOM_ENABLED`   | `1`              | `0`          | No external support chat   |
| `ENABLE_TELEMETRY`      | `1`              | `0`          | No usage metrics to vendor |
| `UNSPLASH_ACCESS_KEY`   | (none)           | (removed)    | No external image API      |
| `SENTRY_DSN`            | (expected)       | (removed)    | No external error tracking |
| `POSTHOG_API_KEY`       | (expected)       | (removed)    | No external analytics      |
| `CLARITY_PROJECT_ID`    | (expected)       | (removed)    | No session recording       |
| `ENABLE_SIGNUP`         | `1`              | `0`          | Invite-only (gov security) |
| `ENABLE_EMAIL_PASSWORD` | `1`              | `0`          | PIV/OIDC only (future)     |

---

## Frontend Changes

### Components Returning `null`

These components render nothing in the government fork:

- `apps/admin/ce/components/common/upgrade-button.tsx`
- `apps/web/ce/components/pages/editor/embed/issue-embed-upgrade-card.tsx`
- `apps/web/core/components/global/product-updates/fallback.tsx`
- `apps/web/core/components/global/chat-support-modal.tsx`
- `apps/web/app/(all)/[workspaceSlug]/(projects)/star-us-link.tsx`

### Components Stubbed

- `apps/web/core/lib/posthog-provider.tsx` - Returns children only, no tracking
- `apps/web/core/hooks/use-chat-support.ts` - Returns `isEnabled: false`

### Removed Components

- `apps/admin/app/(all)/(dashboard)/general/intercom.tsx` (entire file)

### Meta Tags Updated

| File                       | Change                                |
| -------------------------- | ------------------------------------- |
| `apps/admin/app/root.tsx`  | Removed `og:url` pointing to plane.so |
| `apps/space/app/root.tsx`  | Removed Twitter card meta tags        |
| `apps/space/app/error.tsx` | Removed support@plane.so email link   |

---

## Backend Changes

### API Endpoints Modified

#### Instance Configuration API

**File:** `apps/api/plane/license/api/views/instance.py`

**Changed:**

- `POSTHOG_API_KEY` always returns empty
- `POSTHOG_HOST` always returns empty
- `INTERCOM_APP_ID` always returns empty
- `has_unsplash_configured` always returns `False`

### Settings Modified

**File:** `apps/api/plane/settings/common.py`

**Removed/Changed:**

```python
# Removed
ANALYTICS_SECRET_KEY = os.environ.get("ANALYTICS_SECRET_KEY", False)
ANALYTICS_BASE_API = os.environ.get("ANALYTICS_BASE_API", False)
POSTHOG_API_KEY = os.environ.get("POSTHOG_API_KEY", False)
POSTHOG_HOST = os.environ.get("POSTHOG_HOST", False)
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")
```

### Background Tasks Removed

| Task                  | Purpose                                | Status                    |
| --------------------- | -------------------------------------- | ------------------------- |
| `instance_traces`     | Send metrics to plane.so every 6 hours | ✅ Removed from celery.py |
| `event_tracking_task` | Send user events to PostHog            | ✅ Stubbed to no-op       |

---

## Dependencies Changed

### JavaScript/TypeScript

**Removed from package.json:**

- `@intercom/messenger-js-sdk`
- `@posthog/react`
- `posthog-js`
- (Kept in lockfile but unused)

### Python

**Removed from requirements.txt:**

- `posthog`
- (Considered removing but kept for now to avoid import errors)

---

## Authentication Changes

### Added: OIDC Support

**File:** `apps/api/plane/app/views/auth/oidc.py`

**Purpose:** Support Login.gov and other OpenID Connect providers for federal authentication.

**Configuration:**

```bash
IS_OIDC_ENABLED=1
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-secret
OIDC_AUTHORIZATION_URL=https://secure.login.gov/openid_connect/authorize
OIDC_TOKEN_URL=https://secure.login.gov/api/openid_connect/token
OIDC_USERINFO_URL=https://secure.login.gov/api/openid_connect/userinfo
```

**References:**

- Plan: `plans/enable-oidc-authentication.md`
- PR: #15

---

## Documentation Changes

### Added Documentation

- `docs/solutions/security/external-data-exfiltration-prevention.md` - Prevention strategies
- `plans/remove-marketing-content-for-gov-deployment.md` - Original audit findings
- `plans/infrastructure-simplification.md` - Deployment patterns for government
- `config/external-calls-allowlist.yml` - Approved external domains

### Updated Documentation

- `README.md` - Added government fork notice
- `apps/api/.env.example` - Removed tracking service variables, added OIDC
- `apps/web/.env.example` - Removed Sentry/PostHog variables

---

## Testing Changes

### Added Security Tests

**File:** `.github/workflows/security-audit-external-calls.yml`

**Purpose:** CI/CD checks to prevent external data exfiltration

**Checks:**

- No analytics SDKs in code
- No hardcoded external URLs
- No tracking environment variables
- No external resources in email templates
- No browser tracking calls
- No analytics packages in dependencies

---

## Merging Upstream Changes

### Process

1. **NEVER merge blindly** - Always audit first
2. **Run security audit**: `./scripts/security-audit-external-calls.sh`
3. **Check for new services**: Review package.json, requirements.txt changes
4. **Review new files**: Look for analytics initialization
5. **Test in isolation**: Deploy in network-isolated environment
6. **Update this document**: Track new divergence

### Recent Upstream Merges

| Date       | Upstream Commit | Changes                      | Security Review                      |
| ---------- | --------------- | ---------------------------- | ------------------------------------ |
| 2025-12-18 | `ca5cae4`       | Auth improvements, bug fixes | ✅ Passed - No new external calls    |
| 2025-12-15 | `b32a2a1`       | OIDC authentication          | ✅ Approved - Government requirement |

### Known Divergence Points

Files that will ALWAYS conflict with upstream:

- `apps/web/app/entry.client.tsx` - Sentry initialization removed
- `apps/web/app/root.tsx` - Clarity removed
- `apps/api/plane/celery.py` - Telemetry task removed
- `apps/api/plane/utils/telemetry.py` - Stubbed to no-op
- All email templates - External links removed

**Resolution:** Always take fork version (ours), manually merge bug fixes only.

---

## Maintenance Responsibilities

### Security Team

- Monthly review of this document
- Quarterly penetration testing
- Approve new external call requests
- Incident response for unauthorized calls

### Development Team

- Update this document when adding divergence
- Run security audit before all PRs
- Never merge upstream without security review
- Document approved external calls in `config/external-calls-allowlist.yml`

### Operations Team

- Monitor production network traffic
- Block unauthorized domains at firewall
- Alert on unexpected external connections
- Maintain network allowlist

---

## Emergency Contacts

**Security Incident (unauthorized external call detected):**

1. Immediately notify: security-team@treasury.gov
2. File incident: https://internal.treasury.gov/security/incident
3. Block at network level: Contact NOC
4. Update this document with findings

**Questions about fork divergence:**

- Technical Lead: plane-tech-lead@treasury.gov
- Security Approval: plane-security-approver@treasury.gov

---

## Compliance

This fork complies with:

- **OMB M-16-21** - Federal Source Code Policy
- **NIST SP 800-53** - Security and Privacy Controls (SC-7: Boundary Protection)
- **FISMA** - Federal Information Security Management Act
- **CISA TIC 3.0** - Trusted Internet Connections

All modifications are documented for audit purposes.

---

## Version History

| Version | Date       | Changes                    | Approver      |
| ------- | ---------- | -------------------------- | ------------- |
| 1.0     | 2025-12-20 | Initial fork documentation | Security Team |

---

**Next Review Date:** 2025-01-20 (monthly)
