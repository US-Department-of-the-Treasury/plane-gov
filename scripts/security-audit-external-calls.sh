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
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.venv \
  --exclude-dir=build --exclude-dir=dist --exclude-dir=__pycache__ \
  . 2>/dev/null | grep -v test; then
  echo -e "${RED}❌ FAIL: Analytics SDK found${NC}"
  FAILED=1
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 2. External URLs
echo "2. Checking for hardcoded external URLs..."
if grep -rI "https://[a-zA-Z0-9.-]*\.\(com\|io\|net\|org\)" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.py" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=venv --exclude-dir=.venv \
  --exclude-dir=build --exclude-dir=dist --exclude-dir=test --exclude-dir=tests --exclude-dir=__pycache__ \
  . 2>/dev/null | \
  grep -v "github\.com\|googleapis\.com\|login\.gov\|usgovcloudapi\.net\|example\.\|localhost\|127\.0\.0\.1"; then
  echo -e "${YELLOW}⚠️  WARNING: External URL found (may be acceptable)${NC}"
else
  echo -e "${GREEN}✅ PASS${NC}"
fi
echo ""

# 3. Tracking environment variables
echo "3. Checking for tracking environment variables..."
if grep "SENTRY_DSN\|POSTHOG.*KEY\|CLARITY_PROJECT\|INTERCOM_APP_ID\|MIXPANEL_TOKEN" \
  .env.example 2>/dev/null; then
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
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules --exclude-dir=build --exclude-dir=dist \
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
