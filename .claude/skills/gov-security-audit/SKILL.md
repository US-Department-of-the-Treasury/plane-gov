# Gov Security Audit Skill

Automated detection of external network calls and data exfiltration vectors in government forks.

## When to Use

Run this skill:

- Before merging PRs that add new dependencies or external integrations
- After syncing from upstream to detect newly introduced external calls
- As part of security review before government deployment
- When auditing a fork for government compliance

## What It Checks

### 1. Analytics & Telemetry SDKs

- Sentry error reporting
- PostHog analytics
- Microsoft Clarity session recording
- Mixpanel, Amplitude, Google Analytics
- Intercom, Segment

### 2. External API Calls

- Third-party image services (Unsplash, Pexels)
- External CDNs (jsdelivr, unpkg, cdnjs)
- Social media APIs
- Marketing/CRM integrations

### 3. Tracking Environment Variables

- `SENTRY_DSN`, `POSTHOG_KEY`, `CLARITY_PROJECT`
- `INTERCOM_APP_ID`, `MIXPANEL_TOKEN`
- `GA_TRACKING_ID`, `GTM_ID`

### 4. Browser Tracking Calls

- `window.gtag`, `window.ga`, `window.dataLayer`
- `window.clarity`, `window.Intercom`
- `window.Sentry`

## Execution

```bash
# Run the full audit
echo "=== Government Security Audit: External Data Exfiltration Vectors ==="

echo ""
echo "1. Checking for analytics/telemetry SDKs..."
if grep -rI "posthog\|@sentry\|clarity\|mixpanel\|amplitude\|@intercom" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=build --exclude-dir=dist \
  . 2>/dev/null; then
  echo "   FOUND: Analytics SDK references"
else
  echo "   PASS: No analytics SDKs"
fi

echo ""
echo "2. Checking for external CDN URLs..."
if grep -rI "jsdelivr\.net\|unpkg\.com\|cdnjs\.cloudflare" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=dist \
  . 2>/dev/null; then
  echo "   FOUND: External CDN references"
else
  echo "   PASS: No external CDNs"
fi

echo ""
echo "3. Checking for third-party API integrations..."
if grep -rI "unsplash\.com\|api\.pexels\|giphy\.com" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=venv \
  . 2>/dev/null; then
  echo "   FOUND: Third-party API references"
else
  echo "   PASS: No third-party APIs"
fi

echo ""
echo "4. Checking for tracking environment variables..."
if grep -rI "SENTRY_DSN\|POSTHOG\|CLARITY\|INTERCOM\|MIXPANEL\|GA_TRACKING" \
  --include="*.env*" --include="*.ts" --include="*.tsx" --include="*.py" \
  --exclude-dir=node_modules \
  . 2>/dev/null; then
  echo "   FOUND: Tracking environment variables"
else
  echo "   PASS: No tracking env vars"
fi

echo ""
echo "5. Checking package.json for analytics dependencies..."
BLOCKED="@sentry|posthog|@posthog|clarity|@intercom|mixpanel|amplitude"
if grep -E "$BLOCKED" package.json apps/*/package.json 2>/dev/null; then
  echo "   FOUND: Analytics packages in dependencies"
else
  echo "   PASS: No analytics packages"
fi

echo ""
echo "=== Audit Complete ==="
```

## Allowlist

These external calls are **intentionally allowed** for government deployments:

| Domain                | Purpose                | Justification               |
| --------------------- | ---------------------- | --------------------------- |
| `login.gov`           | Federal authentication | Required for OIDC auth      |
| `*.usgovcloudapi.net` | Azure Government       | Government cloud services   |
| `github.com`          | OAuth provider         | User-configured integration |
| `googleapis.com`      | OAuth provider         | User-configured integration |

## Related Files

- `.github/workflows/security-audit-external-calls.yml` - CI/CD enforcement
- `docs/solutions/security-issues/remove-external-data-exfiltration-vectors-gov-deployment.md` - Full documentation
- `TREASURY.md` - Fork configuration and differences

## Output

The skill produces a report categorizing findings:

```
=== Government Security Audit: External Data Exfiltration Vectors ===

1. Checking for analytics/telemetry SDKs...
   PASS: No analytics SDKs

2. Checking for external CDN URLs...
   PASS: No external CDNs

3. Checking for third-party API integrations...
   PASS: No third-party APIs

4. Checking for tracking environment variables...
   PASS: No tracking env vars

5. Checking package.json for analytics dependencies...
   PASS: No analytics packages

=== Audit Complete ===
```

Any `FOUND` results require investigation and remediation before government deployment.
