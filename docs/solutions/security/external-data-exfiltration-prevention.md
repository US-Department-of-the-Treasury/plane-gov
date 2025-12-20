---
title: External Data Exfiltration Prevention for Government Deployments
date: 2025-12-20
category: security
tags: [security, government, data-exfiltration, audit, ci-cd, compliance]
symptoms:
  - Data being sent to external analytics services
  - Tracking pixels in email templates
  - Third-party SDK calls in production
  - Unauthorized network connections
root_cause: Open-source projects often include analytics, error tracking, and marketing integrations by default
related_docs:
  - plans/remove-marketing-content-for-gov-deployment.md
---

# External Data Exfiltration Prevention for Government Deployments

## Executive Summary

Government deployments require **zero tolerance** for unauthorized external data transmission. This document provides prevention strategies, detection patterns, CI/CD checks, and maintenance practices to ensure no sensitive data leaves the security boundary.

**Threat Model:**

- Analytics/telemetry services (PostHog, Sentry, Clarity)
- Marketing/support tools (Intercom, social media pixels)
- CDN-hosted resources (tracking pixels, external images)
- Background tasks sending metrics to vendor servers
- Third-party SDK initialization (even if "disabled")

---

## 1. Prevention Checklist for Future Audits

### Pre-Deployment Security Review

Use this checklist before ANY government deployment:

#### 1.1 Code Audit

- [ ] **Search for external service SDKs**
  - PostHog, Sentry, Clarity, Intercom, Google Analytics, Mixpanel, Amplitude
  - Check package.json, requirements.txt, go.mod, Gemfile, etc.

- [ ] **Search for telemetry endpoints**
  - Any URLs containing "telemetry", "analytics", "tracking", "metrics"
  - Background tasks or scheduled jobs sending data externally

- [ ] **Review email templates**
  - External image URLs (tracking pixels)
  - Marketing/social media links
  - CDN-hosted assets

- [ ] **Check environment variables**
  - `*_API_KEY`, `*_DSN`, `*_TOKEN` for external services
  - Default values pointing to vendor servers

- [ ] **Audit initialization code**
  - SDK initialization in entry points (root.tsx, main.py, etc.)
  - Even "disabled" services may phone home during init

#### 1.2 Configuration Review

- [ ] **Default environment values**
  - All external services default to DISABLED/empty
  - No "phone home" by default behavior

- [ ] **Allowlist external calls**
  - Document expected external calls (OAuth, user-configured webhooks)
  - All others should be blocked or stubbed

- [ ] **Remove upgrade/pricing prompts**
  - No links to vendor pricing pages
  - No "contact sales" CTAs

#### 1.3 Network Testing

- [ ] **Isolated network test**
  - Deploy in network-isolated environment
  - Monitor with tcpdump/Wireshark
  - Verify ZERO unexpected outbound connections

- [ ] **User-action testing**
  - Test OAuth flows (expected to call external IdPs)
  - Test webhook configuration (expected to call user URLs)
  - Verify no background telemetry

---

## 2. Grep Patterns to Detect External Calls

### 2.1 Quick Scan Commands

Run these in your repository root:

```bash
# 1. External service SDKs and APIs
grep -rI "sentry\|posthog\|clarity\|intercom\|mixpanel\|amplitude\|segment\.com" \
  --include="*.{ts,tsx,js,jsx,py,go,rb,java}" \
  --exclude-dir={node_modules,venv,.venv,vendor,build,dist} \
  . | grep -v test

# 2. Analytics initialization patterns
grep -rI "window\.\(gtag\|ga\|dataLayer\|clarity\|Intercom\|Sentry\)" \
  --include="*.{ts,tsx,js,jsx,html}" \
  --exclude-dir={node_modules,build,dist} \
  .

# 3. External HTTPS URLs (excluding common safe domains)
grep -rI "https://[a-zA-Z0-9.-]\+\.\(com\|io\|net\|dev\)" \
  --include="*.{ts,tsx,js,jsx,py,html,json}" \
  --exclude-dir={node_modules,venv,.venv,build,dist,public} \
  . | \
  grep -v "github\.com\|googleapis\.com\|windows\.net\|amazonaws\.com" | \
  grep -v test

# 4. Tracking environment variables
grep -rI "SENTRY_DSN\|POSTHOG\|CLARITY\|INTERCOM\|ANALYTICS.*KEY\|TELEMETRY" \
  --include="*.{env.example,py,ts,tsx,js,go,rb}" \
  .

# 5. Email template external resources
grep -rI "src=\"http\|href=\"http" \
  --include="*.html" \
  apps/api/templates/

# 6. Background tasks and schedulers
grep -rI "requests\.get\|requests\.post\|fetch(\|axios\.\(get\|post\)" \
  --include="*.{py,ts,tsx,js,jsx}" \
  apps/api/ | \
  grep -v "self\.\|this\.\|API_BASE_URL\|settings\."
```

### 2.2 Comprehensive Patterns by Category

#### Analytics/Telemetry Services

```bash
# PostHog
grep -rI "posthog\|ph_" --include="*.{ts,tsx,js,py}" .

# Sentry
grep -rI "@sentry/\|Sentry\.\|SENTRY_DSN" --include="*.{ts,tsx,js,py}" .

# Microsoft Clarity
grep -rI "clarity\|Microsoft\.Clarity" --include="*.{ts,tsx,js,html}" .

# Google Analytics
grep -rI "gtag\|google-analytics\|GA_TRACKING" --include="*.{ts,tsx,js,html}" .

# Mixpanel
grep -rI "mixpanel\|MIXPANEL_TOKEN" --include="*.{ts,tsx,js,py}" .

# Segment
grep -rI "segment\.com\|analytics\.identify" --include="*.{ts,tsx,js}" .
```

#### Customer Support/Marketing

```bash
# Intercom
grep -rI "intercom\|INTERCOM_APP_ID" --include="*.{ts,tsx,js,py}" .

# Drift
grep -rI "drift\.com\|DRIFT_API" --include="*.{ts,tsx,js}" .

# Zendesk
grep -rI "zendesk\|ZENDESK_" --include="*.{ts,tsx,js,py}" .

# HubSpot
grep -rI "hubspot\|HUBSPOT_" --include="*.{ts,tsx,js,py}" .
```

#### External Resource Loading

```bash
# CDN-hosted scripts
grep -rI "cdn\.\(jsdelivr\|unpkg\|cloudflare\|cdnjs\)" \
  --include="*.{html,tsx,ts,js}" .

# External images (potential tracking pixels)
grep -rI "<img.*src=\"http" --include="*.html" .

# External stylesheets
grep -rI "<link.*href=\"http" --include="*.html" .

# Google Fonts (can leak IPs)
grep -rI "fonts\.google\|gstatic\.com" --include="*.{html,tsx,ts,css}" .
```

#### Background Tasks

```bash
# Python requests to external URLs
grep -rI "requests\.\(get\|post\).*http" \
  --include="*.py" \
  apps/api/ | \
  grep -v "localhost\|127.0.0.1\|settings\."

# Scheduled tasks (Celery, Cron)
grep -rI "@periodic_task\|@shared_task\|@app.task" \
  --include="*.py" \
  apps/api/ | \
  xargs grep -l "requests\.\|urllib"

# JavaScript fetch/axios to external domains
grep -rI "fetch(.*http\|axios\.\(get\|post\).*http" \
  --include="*.{ts,tsx,js,jsx}" \
  apps/web/ apps/admin/ apps/space/
```

---

## 3. CI/CD Checks to Catch External Calls

### 3.1 GitHub Actions Workflow

Create `.github/workflows/security-audit-external-calls.yml`:

```yaml
name: Security Audit - External Data Exfiltration

on:
  pull_request:
    branches: [main, master, preview]
  push:
    branches: [main, master, preview]

jobs:
  audit-external-calls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for analytics SDKs
        run: |
          echo "Checking for analytics/telemetry SDKs..."
          if grep -rI "posthog\|sentry\|clarity\|mixpanel\|amplitude" \
            --include="*.{ts,tsx,js,py}" \
            --exclude-dir={node_modules,venv,build,dist} \
            .; then
            echo "❌ FAIL: Analytics SDK found"
            exit 1
          fi
          echo "✅ PASS: No analytics SDKs"

      - name: Check for external URLs in production code
        run: |
          echo "Checking for hardcoded external URLs..."
          # Allow OAuth providers, AWS, Azure Gov
          ALLOWED="github\.com|googleapis\.com|login\.gov|usgovcloudapi\.net"

          if grep -rI "https://[a-zA-Z0-9.-]\+\.\(com\|io\|net\|org\)" \
            --include="*.{ts,tsx,js,py}" \
            --exclude-dir={node_modules,venv,build,dist,test,tests} \
            . | \
            grep -v "$ALLOWED" | \
            grep -v "example\.com\|localhost\|127\.0\.0\.1"; then
            echo "❌ FAIL: Unexpected external URL found"
            exit 1
          fi
          echo "✅ PASS: No unexpected external URLs"

      - name: Check for tracking environment variables
        run: |
          echo "Checking for tracking service environment variables..."
          if grep -I "SENTRY_DSN\|POSTHOG_KEY\|CLARITY_PROJECT\|INTERCOM_APP_ID\|MIXPANEL_TOKEN" \
            --include="*.env.example" .; then
            echo "❌ FAIL: Tracking service environment variable found"
            exit 1
          fi
          echo "✅ PASS: No tracking environment variables"

      - name: Check email templates for external resources
        run: |
          echo "Checking email templates for external resources..."
          if find apps/api/templates -name "*.html" -exec grep -l "src=\"http\|href=\"http" {} \;; then
            echo "❌ FAIL: External resource in email template"
            exit 1
          fi
          echo "✅ PASS: No external resources in email templates"

      - name: Check for window.* tracking calls
        run: |
          echo "Checking for browser tracking calls..."
          if grep -rI "window\.\(gtag\|ga\|dataLayer\|clarity\|Intercom\|Sentry\)" \
            --include="*.{ts,tsx,js}" \
            --exclude-dir={node_modules,build,dist} \
            .; then
            echo "❌ FAIL: Browser tracking call found"
            exit 1
          fi
          echo "✅ PASS: No browser tracking calls"

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check for analytics packages
        run: |
          echo "Checking package.json for analytics dependencies..."
          BLOCKED_PKGS="@sentry/|posthog|@posthog/|clarity|@intercom/|mixpanel|amplitude"

          if grep -E "$BLOCKED_PKGS" package.json apps/*/package.json 2>/dev/null; then
            echo "❌ FAIL: Analytics package found in dependencies"
            exit 1
          fi
          echo "✅ PASS: No analytics packages"

      - name: Check Python requirements for analytics
        run: |
          echo "Checking requirements.txt for analytics dependencies..."
          if grep -iE "sentry|posthog|mixpanel|amplitude" \
            apps/api/requirements*.txt 2>/dev/null; then
            echo "❌ FAIL: Analytics package found in Python requirements"
            exit 1
          fi
          echo "✅ PASS: No analytics packages in Python requirements"
```

### 3.2 Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running security checks for external calls..."

# Check staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Check for analytics SDKs in staged files
if echo "$STAGED_FILES" | grep -E "\.(ts|tsx|js|py)$" | xargs grep -l "posthog\|sentry\|clarity\|intercom" 2>/dev/null; then
  echo "❌ BLOCKED: Analytics SDK detected in staged files"
  echo "Government deployments cannot include telemetry services."
  exit 1
fi

# Check for external URLs in staged files
if echo "$STAGED_FILES" | grep -E "\.(ts|tsx|js|py|html)$" | xargs grep "https://.*\.\(com\|io\|net\)" 2>/dev/null | grep -v "github\.com\|login\.gov"; then
  echo "⚠️  WARNING: External URL detected in staged files"
  echo "Verify this is an expected external call (OAuth, webhooks, etc.)"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Security checks passed"
```

### 3.3 Network Monitoring in CI

Add to your integration test workflow:

```yaml
- name: Network monitoring test
  run: |
    # Start tcpdump in background
    sudo tcpdump -i any -w /tmp/capture.pcap &
    TCPDUMP_PID=$!

    # Run application and tests
    docker-compose up -d
    sleep 30
    npm run test:e2e

    # Stop capture
    sudo kill $TCPDUMP_PID

    # Analyze capture for unexpected destinations
    BLOCKED_DOMAINS="plane\.so|posthog\.|sentry\.|clarity\.|intercom\."

    if sudo tcpdump -r /tmp/capture.pcap -n | grep -E "$BLOCKED_DOMAINS"; then
      echo "❌ FAIL: Unexpected network connection detected"
      sudo tcpdump -r /tmp/capture.pcap -n | grep -E "$BLOCKED_DOMAINS"
      exit 1
    fi

    echo "✅ PASS: No unauthorized network connections"
```

---

## 4. Best Practices for Government Fork Maintenance

### 4.1 Fork Management Strategy

```
Upstream (makeplane/plane)
    ↓
    [Security Barrier]
    ↓
Government Fork (treasury/plane)
    ↓
    [Additional Hardening]
    ↓
Production Deployments
```

**Principles:**

1. **Never merge upstream blindly** - Always security audit first
2. **Document divergence** - Track all intentional differences
3. **Maintain security patches separately** - Don't wait for upstream
4. **Regular audits** - Re-audit after every upstream merge

### 4.2 Divergence Documentation

Maintain `FORK-DIFFERENCES.md` in repository root:

```markdown
# Government Fork Differences from Upstream

This fork removes ALL external data transmission for government compliance.

## Security Modifications

### Removed Services

- **Sentry** - Error reporting (removed in PR #14)
- **PostHog** - Analytics (removed in PR #14)
- **Microsoft Clarity** - Session recording (removed in PR #14)
- **Intercom** - Customer support chat (removed in PR #22)
- **Unsplash API** - External image search (stubbed in PR #18)

### Modified Behavior

- Email templates use inline images (no external URLs)
- Telemetry functions are no-ops
- OAuth limited to Login.gov only
- No upgrade/pricing prompts
- No "Star us on GitHub" links

### Configuration Defaults Changed

- `IS_INTERCOM_ENABLED=0` (was 1)
- `ENABLE_TELEMETRY=0` (was 1)
- `UNSPLASH_ACCESS_KEY=""` (no default)

## Merging Upstream Changes

Before merging from upstream:

1. Run security audit: `./scripts/security-audit.sh`
2. Check for new external services in package.json/requirements.txt
3. Review new email templates for external resources
4. Test in isolated network environment
5. Update this document with any new divergence
```

### 4.3 Configuration Allowlist

Create `config/external-calls-allowlist.yml`:

```yaml
# Approved external calls for government deployment
# Any call NOT on this list should be blocked/removed

oauth_providers:
  - domain: secure.login.gov
    purpose: OIDC authentication
    data_sent: auth_code, state parameter (no PII)
    approved_by: Security Team
    approval_date: 2025-12-15

  - domain: login.microsoftonline.us
    purpose: Azure AD Gov authentication
    data_sent: auth_code, state parameter (no PII)
    approved_by: Security Team
    approval_date: 2025-12-15

user_configured:
  - pattern: "*.webhook.office.com"
    purpose: User-configured Teams webhooks
    data_sent: Issue/task updates (user controls)
    approved_by: Architecture Review
    approval_date: 2025-12-01

  - pattern: "api.github.com"
    purpose: GitHub integration (if user enables)
    data_sent: Repo metadata, issues (user controls)
    approved_by: Architecture Review
    approval_date: 2025-12-01

infrastructure:
  - domain: "*.s3.us-gov-west-1.amazonaws.com"
    purpose: File storage (GovCloud)
    data_sent: User-uploaded files
    approved_by: Infrastructure Team
    approval_date: 2025-11-20

blocked_always:
  - pattern: "*.plane.so"
    reason: "Vendor telemetry/marketing"

  - pattern: "posthog.*"
    reason: "Analytics service"

  - pattern: "sentry.io"
    reason: "Error tracking service"

  - pattern: "clarity.ms|c.clarity.ms"
    reason: "Session recording service"

  - pattern: "*.intercom.*"
    reason: "Customer support chat"

  - pattern: "api.unsplash.com"
    reason: "External image API"
```

### 4.4 Regular Audit Schedule

| Frequency                    | Audit Type          | Scope                          |
| ---------------------------- | ------------------- | ------------------------------ |
| **Every PR**                 | Automated CI checks | New/modified code              |
| **Weekly**                   | Dependency scan     | package.json, requirements.txt |
| **Monthly**                  | Manual code review  | All external call patterns     |
| **Quarterly**                | Network monitoring  | Live staging environment       |
| **Before upstream merge**    | Full security audit | All changes from upstream      |
| **Before production deploy** | Penetration test    | Isolated network test          |

### 4.5 Upstream Merge Checklist

Before merging from upstream `makeplane/plane`:

- [ ] **Review upstream changelog**
  - Note any new integrations or services
  - Check for new environment variables

- [ ] **Run security audit scripts**

  ```bash
  ./scripts/security-audit-external-calls.sh
  ```

- [ ] **Check for new dependencies**

  ```bash
  # JavaScript
  diff <(cat package.json) <(cat /path/to/upstream/package.json)

  # Python
  diff apps/api/requirements/base.txt /path/to/upstream/apps/api/requirements/base.txt
  ```

- [ ] **Review new files**

  ```bash
  git diff --name-status upstream/main | grep "^A" | grep -E "\.(ts|tsx|js|py)$"
  ```

- [ ] **Test in isolated network**
  - Deploy to test environment with no internet access
  - Monitor for failed network calls
  - Verify core functionality works

- [ ] **Update FORK-DIFFERENCES.md**
  - Document any new divergence
  - Update approval dates

- [ ] **Security team sign-off**
  - Present audit findings
  - Get approval before merge

### 4.6 Emergency Patch Process

If upstream releases security patch that adds telemetry:

1. **Cherry-pick security fix only**

   ```bash
   git cherry-pick -n <security-commit-hash>
   # Review changes, remove telemetry additions
   git commit
   ```

2. **Document in commit message**

   ```
   Security fix: [CVE-XXXX] SQL injection in workspace API

   Cherry-picked from upstream commit abc123.
   Removed PostHog tracking call added in same commit.

   Upstream changes:
   - Fixed SQL injection (APPLIED)
   - Added telemetry event (REMOVED)
   ```

3. **Fast-track approval**
   - Security fixes bypass normal review IF telemetry removed
   - Document removal in security log

---

## 5. Verification and Testing

### 5.1 Manual Verification

After removing external calls:

```bash
# 1. Code search verification
grep -rI "plane\.so" . --include="*.{ts,tsx,js,py,html}" | \
  grep -v test | \
  grep -v node_modules | \
  grep -v __pycache__

# 2. Service initialization check
grep -rI "Sentry\.\|posthog\.\|clarity\(" . \
  --include="*.{ts,tsx,js}" \
  --exclude-dir={node_modules,build,dist}

# 3. Environment variable check
grep -rI "SENTRY_DSN\|POSTHOG\|CLARITY\|INTERCOM" \
  --include=".env.example" .

# 4. Email template check
find apps/api/templates -name "*.html" -exec grep "http" {} \; | \
  grep -v "localhost\|127.0.0.1\|{{.*}}"
```

Expected: ALL commands return NO results.

### 5.2 Network-Level Verification

**Isolated network test (REQUIRED before production):**

1. **Set up isolated network**

   ```bash
   # Docker with no internet access
   docker network create --internal gov-test-net

   docker-compose -f docker-compose.isolated.yml up -d
   ```

2. **Monitor network connections**

   ```bash
   # Start monitoring
   sudo tcpdump -i any -n 'host not 127.0.0.1 and host not ::1' -w /tmp/test.pcap

   # In another terminal, run tests
   npm run test:e2e

   # Stop monitoring (Ctrl+C)

   # Analyze capture
   sudo tcpdump -r /tmp/test.pcap -n | \
     grep -v "127.0.0.1\|::1\|172.1[0-9]\.\|192.168\." | \
     grep -E "\.80|\.443"
   ```

3. **Expected results**
   - ZERO connections to external IPs on ports 80/443
   - Only internal container-to-container traffic
   - No DNS lookups for external domains (except during OAuth flows)

### 5.3 Browser DevTools Verification

**Manual browser test:**

1. Open DevTools → Network tab
2. Clear network log
3. Perform common user actions:
   - Sign in
   - Create workspace
   - Create project
   - Upload file
   - Send invite
4. Filter network log:
   - Exclude `localhost`, `127.0.0.1`, your deployment domain
5. **Expected: No external network requests**

**Look for:**

- ❌ `telemetry.plane.so`
- ❌ `posthog.com` or `ph.posthog.com`
- ❌ `sentry.io` or `*.ingest.sentry.io`
- ❌ `clarity.ms` or `c.clarity.ms`
- ❌ `widget.intercom.io`
- ❌ Any other external domains

### 5.4 Automated Browser Testing

Add to Playwright/Cypress tests:

```typescript
// tests/security/no-external-calls.spec.ts
import { test, expect } from "@playwright/test";

test("should make no external network calls", async ({ page, context }) => {
  const externalCalls: string[] = [];

  // Monitor network requests
  page.on("request", (request) => {
    const url = request.url();
    const isExternal = !url.includes("localhost") && !url.includes("127.0.0.1") && !url.startsWith("file://");

    // Allow OAuth domains (Login.gov, Azure Gov)
    const isAllowedOAuth = url.includes("login.gov") || url.includes("usgovcloudapi.net");

    if (isExternal && !isAllowedOAuth) {
      externalCalls.push(url);
    }
  });

  // Perform user actions
  await page.goto("/");
  await page.fill('[name="email"]', "test@example.gov");
  await page.fill('[name="password"]', "password");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");

  // Navigate through app
  await page.click("text=Create Workspace");
  await page.fill('[name="workspace_name"]', "Test Workspace");
  await page.click('button:has-text("Create")');
  await page.waitForLoadState("networkidle");

  // Verify no external calls
  expect(externalCalls).toHaveLength(0);

  if (externalCalls.length > 0) {
    console.error("❌ Unauthorized external calls detected:");
    externalCalls.forEach((url) => console.error(`  - ${url}`));
  }
});
```

---

## 6. Incident Response

### 6.1 If External Call Discovered in Production

**CRITICAL INCIDENT - Immediate Actions:**

1. **DO NOT PANIC** - Assess scope first
2. **Identify service** - What data was sent? To where?
3. **Block at network level** - Firewall rule to block destination immediately
4. **Review logs** - How long was it active? How much data sent?
5. **Incident report** - Document findings per agency policy
6. **Code fix** - Remove/stub the call
7. **Redeploy** - Emergency patch to all environments
8. **Post-mortem** - Why did detection fail? Update CI checks

**Sample firewall block (immediate mitigation):**

```bash
# AWS Security Group
aws ec2 authorize-security-group-egress \
  --group-id sg-xxxxx \
  --ip-permissions IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges='[{CidrIp=TELEMETRY_IP/32,Description="BLOCKED"}]'

# iptables
sudo iptables -A OUTPUT -d TELEMETRY_IP -j REJECT
```

### 6.2 Post-Incident Improvements

After any data exfiltration incident:

- [ ] **Add pattern to CI checks** - Ensure this class of issue is caught
- [ ] **Update documentation** - Add to blocked patterns list
- [ ] **Review similar code** - Search for similar patterns
- [ ] **Network allowlist** - Consider network-level allowlisting
- [ ] **Team training** - Share incident learnings

---

## 7. Approved External Calls

Not all external calls are bad. Document approved patterns:

### 7.1 User-Initiated OAuth

**Allowed:** Calls to OAuth providers during sign-in flow

```typescript
// ALLOWED - User explicitly clicking "Sign in with Login.gov"
const redirectToLoginGov = () => {
  window.location.href = "https://secure.login.gov/openid_connect/authorize?...";
};
```

**Key criteria:**

- User explicitly initiated
- Required for core functionality (authentication)
- Approved by security team
- Government-approved provider (Login.gov, Azure Gov)

### 7.2 User-Configured Webhooks

**Allowed:** Calls to user-specified webhook URLs

```python
# ALLOWED - User configured this webhook URL in settings
def send_webhook(webhook_url: str, payload: dict):
    requests.post(webhook_url, json=payload)
```

**Key criteria:**

- User explicitly configured the URL
- User controls what data is sent
- Documented in user agreement
- Rate-limited to prevent abuse

### 7.3 AWS S3 GovCloud

**Allowed:** File uploads to government S3 buckets

```typescript
// ALLOWED - Uploading to gov S3 bucket for file storage
await s3Client.putObject({
  Bucket: "agency-plane-uploads-govcloud",
  Key: fileKey,
  Body: fileContent,
});
```

**Key criteria:**

- Infrastructure under agency control
- GovCloud region (us-gov-west-1, us-gov-east-1)
- Required for core functionality
- No third-party access

---

## 8. Tools and Resources

### 8.1 Recommended Tools

| Tool                    | Purpose          | Usage                                 |
| ----------------------- | ---------------- | ------------------------------------- |
| **tcpdump**             | Network capture  | `sudo tcpdump -i any -w capture.pcap` |
| **Wireshark**           | Network analysis | GUI for pcap analysis                 |
| **mitmproxy**           | HTTP(S) proxy    | Intercept HTTPS calls                 |
| **Little Snitch** (Mac) | Network monitor  | Real-time outbound connection alerts  |
| **Fiddler** (Windows)   | HTTP(S) debugger | Capture web traffic                   |
| **grep/ripgrep**        | Code search      | Pattern matching                      |
| **Playwright**          | Browser testing  | Automated security tests              |

### 8.2 External Resources

- **NIST SP 800-53** - Security controls (SC-7: Boundary Protection)
- **CISA Trusted Internet Connections (TIC)** - Network security guidance
- **OWASP ASVS** - Application Security Verification Standard
- **CWE-201** - Information Exposure Through Sent Data

### 8.3 Internal Resources

- `plans/remove-marketing-content-for-gov-deployment.md` - Original audit findings
- `config/external-calls-allowlist.yml` - Approved external calls
- `FORK-DIFFERENCES.md` - Government fork modifications
- `.github/workflows/security-audit-external-calls.yml` - Automated checks

---

## 9. Summary

**Prevention is easier than detection.**

1. **Default deny** - No external calls unless explicitly approved
2. **Automated checks** - CI/CD catches issues before merge
3. **Regular audits** - Manual review complements automation
4. **Network testing** - Final verification in isolated environment
5. **Document everything** - Track divergence from upstream
6. **Fast response** - Incident plan for discovered issues

**Remember:** Even "disabled" services can phone home. When in doubt, stub it out.

---

## Appendix A: Complete Security Audit Script

Save as `scripts/security-audit-external-calls.sh`:

```bash
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

echo "========================================"
echo "  External Data Exfiltration Audit"
echo "========================================"
echo ""

# 1. Analytics SDKs
echo "1. Checking for analytics SDKs..."
if grep -rI "posthog\|@sentry/\|clarity\|intercom\|mixpanel\|amplitude" \
  --include="*.{ts,tsx,js,py}" \
  --exclude-dir={node_modules,venv,.venv,build,dist,__pycache__} \
  . 2>/dev/null | grep -v test; then
  echo -e "${RED}❌ FAIL: Analytics SDK found${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 2. External URLs
echo "2. Checking for hardcoded external URLs..."
if grep -rI "https://[a-zA-Z0-9.-]\+\.\(com\|io\|net\|org\)" \
  --include="*.{ts,tsx,js,py,html}" \
  --exclude-dir={node_modules,venv,.venv,build,dist,test,tests,__pycache__} \
  . 2>/dev/null | \
  grep -v "github\.com\|googleapis\.com\|login\.gov\|usgovcloudapi\.net\|example\.\|localhost\|127\.0\.0\.1"; then
  echo -e "${YELLOW}⚠️  WARNING: External URL found (may be acceptable)${NC}"
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 3. Tracking environment variables
echo "3. Checking for tracking environment variables..."
if grep -I "SENTRY_DSN\|POSTHOG.*KEY\|CLARITY_PROJECT\|INTERCOM_APP_ID\|MIXPANEL_TOKEN" \
  --include=".env.example" \
  . 2>/dev/null; then
  echo -e "${RED}❌ FAIL: Tracking environment variable found${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 4. Email template external resources
echo "4. Checking email templates..."
if find apps/api/templates -name "*.html" -exec grep -l "src=\"http\|href=\"http" {} \; 2>/dev/null; then
  echo -e "${RED}❌ FAIL: External resource in email template${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 5. Browser tracking calls
echo "5. Checking for browser tracking calls..."
if grep -rI "window\.\(gtag\|ga\|dataLayer\|clarity\|Intercom\|Sentry\)" \
  --include="*.{ts,tsx,js}" \
  --exclude-dir={node_modules,build,dist} \
  . 2>/dev/null; then
  echo -e "${RED}❌ FAIL: Browser tracking call found${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 6. Package dependencies
echo "6. Checking package.json dependencies..."
if grep -E "@sentry/|posthog|@posthog/|clarity|@intercom/|mixpanel|amplitude" \
  package.json apps/*/package.json 2>/dev/null; then
  echo -e "${RED}❌ FAIL: Analytics package in dependencies${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 7. Python requirements
echo "7. Checking Python requirements..."
if grep -iE "sentry|posthog|mixpanel|amplitude" \
  apps/api/requirements*.txt 2>/dev/null; then
  echo -e "${RED}❌ FAIL: Analytics package in Python requirements${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# Summary
echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ AUDIT PASSED${NC}"
  exit 0
else
  echo -e "${RED}❌ AUDIT FAILED${NC}"
  echo "Review findings above and remediate before deployment."
  exit 1
fi
```

Make executable:

```bash
chmod +x scripts/security-audit-external-calls.sh
```

Run before every deployment:

```bash
./scripts/security-audit-external-calls.sh
```
