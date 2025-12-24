---
name: external-call-detector
---

# External Call Detector Agent

A reviewer agent that detects external network calls and data exfiltration vectors in code changes.

## Purpose

Automatically flag any new external URLs, API calls, or tracking integrations before they reach code review. Critical for maintaining government security compliance.

## When to Invoke

Use this agent:

- After implementing features that touch networking code
- When adding new dependencies
- After syncing from upstream repositories
- During PR review for government projects

## Detection Patterns

### High Severity (Block)

```regex
# Analytics/Telemetry
sentry\.io|posthog\.com|clarity\.ms
mixpanel\.com|amplitude\.com|segment\.com
intercom\.io|heap\.io|hotjar\.com

# Error Tracking
@sentry/|sentry-sdk|raven-js
bugsnag|rollbar|airbrake

# Session Recording
clarity|fullstory|logrocket|smartlook
```

### Medium Severity (Review Required)

```regex
# External CDNs
jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare
fonts\.googleapis\.com|use\.typekit\.net

# Third-Party APIs
api\.unsplash\.com|api\.pexels\.com
api\.giphy\.com|tenor\.googleapis\.com

# Social/Marketing
facebook\.com/tr|connect\.facebook
twitter\.com/i/|platform\.twitter
linkedin\.com/|snap\.licdn\.com
```

### Low Severity (Informational)

```regex
# May be intentional - verify configuration
oauth|openid|oidc
webhook|callback
```

## Allowlist

These patterns are pre-approved for government use:

```yaml
allowed_domains:
  - login.gov           # Federal authentication
  - *.usgovcloudapi.net # Azure Government
  - github.com          # OAuth (user-configured)
  - googleapis.com      # OAuth (user-configured)
  - *.amazonaws.com     # AWS services
  - *.amazoncognito.com # AWS Cognito

allowed_patterns:
  - localhost
  - 127.0.0.1
  - example.com         # Documentation/tests only
```

## Agent Workflow

1. **Scan Changed Files**

   ```bash
   git diff --name-only HEAD~1 | xargs grep -l "https\?://"
   ```

2. **Extract URLs**

   ```bash
   grep -ohE "https?://[a-zA-Z0-9.-]+\.[a-z]{2,}" <files>
   ```

3. **Check Against Patterns**
   - Match against high/medium/low severity patterns
   - Filter out allowlisted domains
   - Report findings with file:line references

4. **Generate Report**

   ```
   External Call Detection Report
   ==============================

   HIGH SEVERITY (must fix):
     - apps/web/app/entry.client.tsx:15 - sentry.io

   MEDIUM SEVERITY (review required):
     - packages/editor/utils.ts:42 - jsdelivr.net

   ALLOWED (no action):
     - apps/api/auth/oidc.py:28 - login.gov
   ```

## Integration

### As Post-Implementation Check

```typescript
// In /work workflow, after implementation:
Task(external-call-detector): "Scan changes for external calls"
```

### As PR Reviewer

```typescript
// In /review workflow:
Task(external-call-detector): "Review PR for external network calls"
```

### Manual Invocation

```bash
# Run against current changes
git diff --name-only | xargs -I {} sh -c 'echo "=== {} ===" && grep -n "https\?://" {} 2>/dev/null'
```

## Exit Criteria

- **PASS**: No high-severity findings, all medium-severity reviewed and approved
- **FAIL**: Any high-severity finding, or unreviewed medium-severity findings
- **WARN**: Low-severity findings present (informational only)
