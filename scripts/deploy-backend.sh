#!/bin/bash
set -e

# Deploy Django Backend to Elastic Beanstalk
# Usage: ./deploy-backend.sh [environment-name]
#
# IMPORTANT LEARNINGS:
# - Amazon Linux 2023 platform hooks (.platform/hooks/prebuild/) can be unreliable
# - USE container_commands in .ebextensions instead - they work reliably on AL2 and AL2023
# - psycopg v3 requires DATABASE_URL format: postgresql+psycopg://user:pass@host:port/db
# - Secrets are fetched in container_commands (00-validate.config) and written to custom_env
# - Other container_commands source /opt/elasticbeanstalk/deployment/custom_env to get credentials
# - container_commands run after app staging but before Procfile start

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo "Deploying Django backend to Elastic Beanstalk"
echo "========================================="

# Configuration - override via environment or command line
EB_ENV="${1:-${EB_ENV:-treasury-plane-dev}}"
EB_APP="${EB_APP:-treasury-plane}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Use the standard EB bucket for the region/account
S3_BUCKET="elasticbeanstalk-${AWS_REGION}-$(aws sts get-caller-identity --query Account --output text)"
S3_PREFIX="treasury-plane"

echo "Application: $EB_APP"
echo "Environment: $EB_ENV"
echo "S3 Bucket: $S3_BUCKET/$S3_PREFIX"

# Create deployment staging directory (use /tmp to avoid polluting repo)
STAGING_DIR="/tmp/eb-deploy-$$"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

echo ""
echo "Staging deployment package..."

# Copy Django application code (includes .ebextensions, .platform, Procfile)
cp -r "$PROJECT_ROOT/apps/api/"* "$STAGING_DIR/"
cp -r "$PROJECT_ROOT/apps/api/.ebextensions" "$STAGING_DIR/"
cp -r "$PROJECT_ROOT/apps/api/.platform" "$STAGING_DIR/" 2>/dev/null || true

# Remove files that shouldn't be deployed
cd "$STAGING_DIR"
rm -rf venv .venv .env .coveragerc .prettierignore CLAUDE.md package.json node_modules __pycache__ .git .pytest_cache .mypy_cache *.egg-info 2>/dev/null || true

# CRITICAL: Make platform hooks executable (AL2023 requirement)
echo "Setting platform hooks as executable..."
find .platform/hooks -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

# Create version label
VERSION_LABEL="treasury-plane-v$(date +%Y%m%d-%H%M%S)"
ZIP_FILE="/tmp/${VERSION_LABEL}.zip"

echo "Creating deployment bundle: $ZIP_FILE"

# Create zip file (excluding virtual environment and cache)
zip -r "$ZIP_FILE" . \
    -x "*.pyc" \
    -x "*/__pycache__/*" \
    -x "venv/*" \
    -x ".venv/*" \
    -x "*.egg-info/*" \
    -x ".git/*" \
    -x "*.log"

# Verify critical files are in the bundle
echo ""
echo "Verifying deployment bundle..."
if ! unzip -l "$ZIP_FILE" | grep -q "Procfile"; then
    echo "ERROR: Procfile missing from bundle!"
    exit 1
fi
if ! unzip -l "$ZIP_FILE" | grep -q "manage.py"; then
    echo "ERROR: manage.py missing from bundle!"
    exit 1
fi
if ! unzip -l "$ZIP_FILE" | grep -q ".ebextensions/00-validate.config"; then
    echo "ERROR: .ebextensions/00-validate.config missing from bundle!"
    exit 1
fi
echo "Bundle verification passed."

# Upload to S3
echo ""
echo "Uploading to S3..."
S3_KEY="${S3_PREFIX}/${VERSION_LABEL}.zip"
aws s3 cp "$ZIP_FILE" "s3://$S3_BUCKET/$S3_KEY" --region "$AWS_REGION"

# Create new application version
echo ""
echo "Creating application version: $VERSION_LABEL"
aws elasticbeanstalk create-application-version \
    --application-name "$EB_APP" \
    --version-label "$VERSION_LABEL" \
    --source-bundle S3Bucket="$S3_BUCKET",S3Key="$S3_KEY" \
    --description "Deployment from $(hostname) at $(date)" \
    --region "$AWS_REGION" > /dev/null

# Deploy to environment
echo ""
echo "Deploying to environment: $EB_ENV"
aws elasticbeanstalk update-environment \
    --environment-name "$EB_ENV" \
    --version-label "$VERSION_LABEL" \
    --region "$AWS_REGION" > /dev/null

# Wait for deployment with timeout and status updates
echo ""
echo "Waiting for deployment to complete..."
echo "(This may take 3-5 minutes)"
echo ""

TIMEOUT=300
ELAPSED=0
LAST_STATUS=""

while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(aws elasticbeanstalk describe-environments \
        --environment-names "$EB_ENV" \
        --query 'Environments[0].Status' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)

    HEALTH=$(aws elasticbeanstalk describe-environments \
        --environment-names "$EB_ENV" \
        --query 'Environments[0].Health' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)

    CURRENT_VERSION=$(aws elasticbeanstalk describe-environments \
        --environment-names "$EB_ENV" \
        --query 'Environments[0].VersionLabel' \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)

    # Only print when status changes or every 30 seconds
    if [ "$STATUS-$HEALTH" != "$LAST_STATUS" ] || [ $((ELAPSED % 30)) -eq 0 ]; then
        echo "  [$(date +%H:%M:%S)] Status: $STATUS | Health: $HEALTH | Version: $CURRENT_VERSION"
        LAST_STATUS="$STATUS-$HEALTH"
    fi

    if [ "$STATUS" = "Ready" ] && [ "$CURRENT_VERSION" = "$VERSION_LABEL" ]; then
        break
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

# Check final status
echo ""
if [ "$STATUS" = "Ready" ] && [ "$CURRENT_VERSION" = "$VERSION_LABEL" ]; then
    if [ "$HEALTH" = "Green" ]; then
        echo "========================================="
        echo "DEPLOYMENT SUCCESSFUL!"
        echo "========================================="
        echo "Version: $VERSION_LABEL"
        echo "Environment: $EB_ENV"
        echo "Health: $HEALTH"

        # Get environment URL
        CNAME=$(aws elasticbeanstalk describe-environments \
            --environment-names "$EB_ENV" \
            --query 'Environments[0].CNAME' \
            --output text \
            --region "$AWS_REGION" 2>/dev/null)
        echo "Direct URL: http://$CNAME"

        # Get API URL from terraform if available
        cd "$PROJECT_ROOT/terraform" 2>/dev/null
        API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
        if [ -n "$API_URL" ]; then
            echo "API URL: $API_URL"
        fi

        echo ""
        echo "Test health endpoint:"
        echo "  curl http://$CNAME/api/health/"
    else
        echo "========================================="
        echo "DEPLOYMENT COMPLETED - HEALTH DEGRADED"
        echo "========================================="
        echo "Version deployed but health is: $HEALTH"
        echo ""
        echo "This could be temporary. Check logs:"
        echo "  aws elasticbeanstalk request-environment-info --environment-name $EB_ENV --info-type bundle"
        echo "  # Wait 30 seconds, then:"
        echo "  aws elasticbeanstalk retrieve-environment-info --environment-name $EB_ENV --info-type bundle"
    fi
else
    echo "========================================="
    echo "DEPLOYMENT FAILED"
    echo "========================================="
    echo "Final status: $STATUS"
    echo "Health: $HEALTH"
    echo "Expected version: $VERSION_LABEL"
    echo "Current version: $CURRENT_VERSION"
    echo ""
    echo "Recent events:"
    aws elasticbeanstalk describe-events \
        --environment-name "$EB_ENV" \
        --max-items 10 \
        --query 'Events[*].{Time:EventDate,Severity:Severity,Message:Message}' \
        --output table \
        --region "$AWS_REGION" 2>/dev/null | head -40

    echo ""
    echo "Get detailed logs:"
    echo "  aws elasticbeanstalk request-environment-info --environment-name $EB_ENV --info-type bundle"
    echo "  # Wait 30 seconds, then:"
    echo "  aws elasticbeanstalk retrieve-environment-info --environment-name $EB_ENV --info-type bundle"

    # Cleanup
    rm -rf "$STAGING_DIR"
    rm -f "$ZIP_FILE"
    exit 1
fi

# Cleanup
rm -rf "$STAGING_DIR"
rm -f "$ZIP_FILE"

echo ""
echo "Done!"
