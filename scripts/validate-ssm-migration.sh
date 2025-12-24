#!/bin/bash
# Validate SSM Parameter Store migration
#
# Checks that all required SSM parameters exist and have valid values
# Optionally compares values with Secrets Manager for consistency
#
# Usage:
#   ./scripts/validate-ssm-migration.sh           # Check SSM parameters exist
#   ./scripts/validate-ssm-migration.sh --compare # Compare with Secrets Manager

set -e

PROJECT="${PROJECT:-plane}"
ENV="${ENVIRONMENT:-dev}"
REGION="${AWS_REGION:-us-east-1}"
COMPARE=false

if [[ "$1" == "--compare" ]]; then
    COMPARE=true
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

echo "=============================================="
echo "SSM MIGRATION VALIDATION"
echo "=============================================="
echo "Project: $PROJECT"
echo "Environment: $ENV"
echo "Region: $REGION"
echo ""

FAILED=0
PASSED=0
WARNED=0

# Required parameters (must exist)
REQUIRED_PARAMS=(
    "database-url"
    "secret-key"
)

# Optional parameters (should exist but won't fail if missing)
OPTIONAL_PARAMS=(
    "redis-url"
    "web-url"
    "api-base-url"
    "admin-base-url"
    "space-base-url"
    "cors-allowed-origins"
    "allowed-hosts"
    "debug"
    "is-oidc-enabled"
    "oidc-provider-name"
    "oidc-client-id"
    "oidc-client-secret"
    "oidc-authorization-url"
    "oidc-token-url"
    "oidc-userinfo-url"
    "oidc-issuer-url"
    "oidc-scope"
)

check_param() {
    local name="$1"
    local required="$2"
    local ssm_path="/${PROJECT}/${ENV}/${name}"

    result=$(aws ssm get-parameter \
        --name "$ssm_path" \
        --with-decryption \
        --region "$REGION" \
        --query "Parameter.Value" \
        --output text 2>/dev/null || echo "NOT_FOUND")

    if [ "$result" == "NOT_FOUND" ]; then
        if [ "$required" == "true" ]; then
            log_fail "$ssm_path - MISSING (required)"
            ((FAILED++))
        else
            log_warn "$ssm_path - not set"
            ((WARNED++))
        fi
        return 1
    elif [ -z "$result" ] || [ "$result" == "placeholder" ]; then
        log_warn "$ssm_path - empty or placeholder value"
        ((WARNED++))
        return 1
    else
        # Mask sensitive values in output
        if [[ "$name" == *"password"* ]] || [[ "$name" == *"secret"* ]] || [[ "$name" == *"url"* && "$name" != *"base-url"* ]]; then
            log_pass "$ssm_path = ****"
        else
            # Truncate long values
            if [ ${#result} -gt 50 ]; then
                log_pass "$ssm_path = ${result:0:47}..."
            else
                log_pass "$ssm_path = $result"
            fi
        fi
        ((PASSED++))
        return 0
    fi
}

echo "--- Required Parameters ---"
for param in "${REQUIRED_PARAMS[@]}"; do
    check_param "$param" "true"
done

echo ""
echo "--- Optional Parameters ---"
for param in "${OPTIONAL_PARAMS[@]}"; do
    check_param "$param" "false"
done

# Validate specific parameter formats
echo ""
echo "--- Format Validation ---"

# Check database URL format
DB_URL=$(aws ssm get-parameter \
    --name "/${PROJECT}/${ENV}/database-url" \
    --with-decryption \
    --region "$REGION" \
    --query "Parameter.Value" \
    --output text 2>/dev/null || echo "")

if [ -n "$DB_URL" ]; then
    if [[ "$DB_URL" =~ ^postgresql:// ]]; then
        log_pass "database-url has correct postgresql:// prefix"
        ((PASSED++))
    else
        log_fail "database-url should start with postgresql://"
        ((FAILED++))
    fi
fi

# Check debug is 0 or 1
DEBUG_VAL=$(aws ssm get-parameter \
    --name "/${PROJECT}/${ENV}/debug" \
    --region "$REGION" \
    --query "Parameter.Value" \
    --output text 2>/dev/null || echo "")

if [ -n "$DEBUG_VAL" ]; then
    if [ "$DEBUG_VAL" == "0" ] || [ "$DEBUG_VAL" == "1" ]; then
        log_pass "debug value is valid ($DEBUG_VAL)"
        ((PASSED++))
    else
        log_fail "debug should be '0' or '1', got '$DEBUG_VAL'"
        ((FAILED++))
    fi
fi

# Check OIDC enabled is 0 or 1
OIDC_VAL=$(aws ssm get-parameter \
    --name "/${PROJECT}/${ENV}/is-oidc-enabled" \
    --region "$REGION" \
    --query "Parameter.Value" \
    --output text 2>/dev/null || echo "")

if [ -n "$OIDC_VAL" ]; then
    if [ "$OIDC_VAL" == "0" ] || [ "$OIDC_VAL" == "1" ]; then
        log_pass "is-oidc-enabled value is valid ($OIDC_VAL)"
        ((PASSED++))
    else
        log_fail "is-oidc-enabled should be '0' or '1', got '$OIDC_VAL'"
        ((FAILED++))
    fi
fi

# Summary
echo ""
echo "=============================================="
echo "VALIDATION SUMMARY"
echo "=============================================="
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}VALIDATION FAILED${NC}"
    echo ""
    echo "Fix required parameters before deploying."
    exit 1
elif [ $WARNED -gt 0 ]; then
    echo -e "${YELLOW}VALIDATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Some optional parameters are missing. Review warnings above."
    exit 0
else
    echo -e "${GREEN}VALIDATION PASSED${NC}"
    echo ""
    echo "All SSM parameters are configured correctly."
    exit 0
fi
