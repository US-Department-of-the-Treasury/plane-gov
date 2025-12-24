#!/bin/bash
set -e

# Deploy Frontend Apps to S3 + CloudFront (Single Domain Architecture)
# =====================================================================
# All apps are served from a single domain with path-based routing:
#   /           → Web app
#   /god-mode/* → Admin app
#   /spaces/*   → Space app
#
# Usage: ./deploy-frontend.sh [web|admin]
#
# Note: 'space' app has SSR enabled and requires server deployment (not S3)
#
# Troubleshooting:
# - If the build runs out of memory, increase Node's heap size:
#   NODE_OPTIONS="--max-old-space-size=16384" ./deploy-frontend.sh web

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$REPO_ROOT/terraform"

APP=$1

if [ -z "$APP" ]; then
    echo "Usage: $0 [web|admin]"
    echo ""
    echo "Note: 'space' app requires SSR and cannot be deployed to S3."
    echo "      Use deploy-backend.sh or a server-based deployment for space."
    exit 1
fi

if [[ ! "$APP" =~ ^(web|admin)$ ]]; then
    echo "Error: APP must be one of: web, admin"
    echo ""
    echo "Note: 'space' app requires SSR and cannot be deployed to S3."
    exit 1
fi

echo "========================================="
echo "Deploying $APP frontend to AWS"
echo "========================================="

# Get infrastructure outputs from Terraform
cd "$TERRAFORM_DIR"

BUCKET=$(terraform output -raw "${APP}_bucket" 2>/dev/null) || {
    echo "Error: Could not get ${APP}_bucket from Terraform outputs"
    echo "Run 'terraform apply' first to create infrastructure"
    exit 1
}

# Single CloudFront distribution for all apps
CLOUDFRONT_ID=$(terraform output -raw cloudfront_id 2>/dev/null) || {
    echo "Error: Could not get cloudfront_id from Terraform outputs"
    exit 1
}

# Get base URL (single domain)
BASE_URL=$(terraform output -raw base_url 2>/dev/null) || {
    echo "Error: Could not get base_url from Terraform outputs"
    exit 1
}

API_URL=$(terraform output -raw api_url 2>/dev/null) || {
    echo "Error: Could not get api_url from Terraform outputs"
    exit 1
}

ADMIN_URL=$(terraform output -raw admin_url 2>/dev/null) || {
    echo "Warning: Could not get admin_url from Terraform outputs"
    ADMIN_URL="${BASE_URL}/god-mode"
}

SPACE_URL=$(terraform output -raw space_url 2>/dev/null) || {
    echo "Warning: Could not get space_url from Terraform outputs"
    SPACE_URL="${BASE_URL}/spaces"
}

WEB_URL=$(terraform output -raw web_url 2>/dev/null) || {
    echo "Warning: Could not get web_url from Terraform outputs"
    WEB_URL="$BASE_URL"
}

LIVE_URL=$(terraform output -raw live_url 2>/dev/null) || {
    echo "Warning: Could not get live_url from Terraform outputs"
    LIVE_URL="${BASE_URL/https:/wss:}/live"
}

echo "Bucket: $BUCKET"
echo "CloudFront: $CLOUDFRONT_ID"
echo "Base URL: $BASE_URL"
echo "API URL: $API_URL"
echo "Admin URL: $ADMIN_URL"
echo "Space URL: $SPACE_URL"
echo "Web URL: $WEB_URL"
echo "Live URL: $LIVE_URL"

# Navigate to app directory
APP_DIR="$REPO_ROOT/apps/$APP"
if [ ! -d "$APP_DIR" ]; then
    echo "Error: App directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# ==============================================================================
# Set environment variables for build
# ==============================================================================

# All apps use the same base domain
# IMPORTANT: VITE_API_BASE_URL should be the base domain WITHOUT /api suffix
# because the frontend code adds /api/ to all API paths.
# Using $API_URL here would cause double /api/api/ paths.
export VITE_API_BASE_URL="$BASE_URL"
export VITE_ADMIN_BASE_URL="$ADMIN_URL"
export VITE_SPACE_BASE_URL="$SPACE_URL"
export VITE_WEB_BASE_URL="$WEB_URL"
export VITE_LIVE_BASE_URL="$LIVE_URL"

# Path-based routing configuration
# Each app runs at a specific path prefix
case "$APP" in
    "web")
        # Web app is at root
        export VITE_BASE_PATH="/"
        export VITE_ADMIN_BASE_PATH="/god-mode/"
        export VITE_SPACE_BASE_PATH="/spaces/"
        export VITE_LIVE_BASE_PATH="/live/"
        S3_PREFIX=""
        INVALIDATION_PATH="/*"
        ;;
    "admin")
        # Admin app is at /god-mode
        export VITE_BASE_PATH="/god-mode/"
        export VITE_ADMIN_BASE_PATH="/god-mode/"
        export VITE_SPACE_BASE_PATH="/spaces/"
        export VITE_LIVE_BASE_PATH="/live/"
        S3_PREFIX=""
        # Only invalidate admin paths
        INVALIDATION_PATH="/god-mode/*"
        ;;
esac

echo ""
echo "Build environment:"
echo "  VITE_API_BASE_URL=$VITE_API_BASE_URL"
echo "  VITE_ADMIN_BASE_URL=$VITE_ADMIN_BASE_URL"
echo "  VITE_SPACE_BASE_URL=$VITE_SPACE_BASE_URL"
echo "  VITE_WEB_BASE_URL=$VITE_WEB_BASE_URL"
echo "  VITE_LIVE_BASE_URL=$VITE_LIVE_BASE_URL"
echo "  VITE_BASE_PATH=$VITE_BASE_PATH"

echo ""
echo "Installing dependencies (pnpm workspace)..."
cd "$REPO_ROOT"
pnpm install --frozen-lockfile

echo ""
echo "Building production bundle..."
pnpm --filter "$APP" run build

# React Router with ssr:false builds to build/client/
BUILD_DIR="$APP_DIR/build/client"
if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build directory not found: $BUILD_DIR"
    echo "Expected React Router static build output at build/client/"
    exit 1
fi

# Sync to S3
echo ""
echo "Uploading to S3..."

# Static assets with long cache (JS, CSS, images)
aws s3 sync "$BUILD_DIR/" "s3://${BUCKET}/${S3_PREFIX}" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json" \
    --exclude "robots.txt"

# HTML and service files without cache (must revalidate for SPA routing)
aws s3 sync "$BUILD_DIR/" "s3://${BUCKET}/${S3_PREFIX}" \
    --cache-control "public, max-age=0, must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "service-worker.js" \
    --include "manifest.json" \
    --include "robots.txt"

# Invalidate CloudFront cache for this app's paths
echo ""
echo "Invalidating CloudFront cache for $INVALIDATION_PATH..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_ID" \
    --paths "$INVALIDATION_PATH" \
    --query 'Invalidation.Id' \
    --output text)

echo "Invalidation ID: $INVALIDATION_ID"
echo ""
echo "Waiting for invalidation to complete..."
aws cloudfront wait invalidation-completed \
    --distribution-id "$CLOUDFRONT_ID" \
    --id "$INVALIDATION_ID"

# Determine the app URL based on app type
case "$APP" in
    "web")
        APP_URL="$WEB_URL"
        ;;
    "admin")
        APP_URL="$ADMIN_URL"
        ;;
esac

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo "URL: $APP_URL"
echo ""
echo "Verifying deployment..."

# Verify the app is accessible
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✓ App is accessible (HTTP $HTTP_STATUS)"
else
    echo "⚠ Warning: App returned HTTP $HTTP_STATUS (may need a few minutes for CloudFront propagation)"
fi
