#!/bin/bash
set -e

# Master Deployment Script for Treasury Plane
# This script orchestrates a full deployment from scratch
#
# Usage: ./deploy-all.sh [--skip-terraform] [--skip-backend] [--skip-frontend]
#
# What this deploys:
# 1. Terraform infrastructure (VPC, ALB, EB, Aurora, Redis, CloudFront, S3)
# 2. Django backend to Elastic Beanstalk
# 3. Web frontend to CloudFront/S3
# 4. Admin frontend to CloudFront/S3 (with /god-mode/ basename)
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Terraform >= 1.6.0 installed
# - Node.js and npm installed (for frontend builds)
# - terraform/terraform.tfvars configured with your settings

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$REPO_ROOT/terraform"

# Parse arguments
SKIP_TERRAFORM=false
SKIP_BACKEND=false
SKIP_FRONTEND=false

for arg in "$@"; do
    case $arg in
        --skip-terraform)
            SKIP_TERRAFORM=true
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-terraform  Skip Terraform infrastructure deployment"
            echo "  --skip-backend    Skip Django backend deployment to EB"
            echo "  --skip-frontend   Skip frontend deployments to CloudFront"
            echo ""
            echo "Example: $0 --skip-terraform  # Only deploy apps"
            exit 0
            ;;
    esac
done

echo "========================================="
echo "Treasury Plane - Full Deployment"
echo "========================================="
echo "Repository: $REPO_ROOT"
echo "Skip Terraform: $SKIP_TERRAFORM"
echo "Skip Backend: $SKIP_BACKEND"
echo "Skip Frontend: $SKIP_FRONTEND"
echo ""

# Track timing
START_TIME=$(date +%s)

#######################################
# Step 1: Terraform Infrastructure
#######################################
if [ "$SKIP_TERRAFORM" = false ]; then
    echo ""
    echo "========================================="
    echo "Step 1: Deploying Infrastructure"
    echo "========================================="

    cd "$TERRAFORM_DIR"

    # Ensure Terraform is initialized
    if [ ! -d ".terraform" ]; then
        echo "Initializing Terraform..."
        terraform init
    fi

    # Validate configuration
    echo "Validating Terraform configuration..."
    terraform validate

    # Plan and apply
    echo ""
    echo "Planning infrastructure changes..."
    terraform plan -out=tfplan

    echo ""
    echo "Applying infrastructure..."
    terraform apply tfplan
    rm -f tfplan

    echo ""
    echo "Infrastructure deployed successfully!"
else
    echo ""
    echo "Skipping Terraform deployment (--skip-terraform)"
fi

#######################################
# Step 2: Django Backend
#######################################
if [ "$SKIP_BACKEND" = false ]; then
    echo ""
    echo "========================================="
    echo "Step 2: Deploying Django Backend"
    echo "========================================="

    "$SCRIPT_DIR/deploy-backend.sh"

    echo ""
    echo "Backend deployed successfully!"

    # Fix ALB target group after EB deployment
    # EB creates its own target group, but ALB listener points to Terraform's empty one
    echo ""
    echo "========================================="
    echo "Step 2b: Fixing ALB Target Group"
    echo "========================================="
    "$SCRIPT_DIR/fix-alb-target-group.sh"
else
    echo ""
    echo "Skipping backend deployment (--skip-backend)"
fi

#######################################
# Step 3: Frontend Apps
#######################################
if [ "$SKIP_FRONTEND" = false ]; then
    echo ""
    echo "========================================="
    echo "Step 3: Deploying Frontend Apps"
    echo "========================================="

    # Deploy web app
    echo ""
    echo "--- Deploying Web App ---"
    "$SCRIPT_DIR/deploy-frontend.sh" web

    # Deploy admin app
    echo ""
    echo "--- Deploying Admin App ---"
    "$SCRIPT_DIR/deploy-frontend.sh" admin

    echo ""
    echo "Frontend apps deployed successfully!"
else
    echo ""
    echo "Skipping frontend deployment (--skip-frontend)"
fi

#######################################
# Verification
#######################################
echo ""
echo "========================================="
echo "Verification"
echo "========================================="

cd "$TERRAFORM_DIR"

# Get URLs
API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
WEB_URL=$(terraform output -raw web_url 2>/dev/null || echo "")
ADMIN_URL=$(terraform output -raw admin_url 2>/dev/null || echo "")

echo ""
echo "Checking endpoints..."

# Check API
if [ -n "$API_URL" ]; then
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" --max-time 10 2>/dev/null || echo "000")
    if [ "$API_STATUS" = "200" ]; then
        echo "✓ API ($API_URL): HTTP $API_STATUS"
    else
        echo "⚠ API ($API_URL): HTTP $API_STATUS (may need a few minutes to stabilize)"
    fi
fi

# Check Web
if [ -n "$WEB_URL" ]; then
    WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" --max-time 10 2>/dev/null || echo "000")
    if [ "$WEB_STATUS" = "200" ]; then
        echo "✓ Web ($WEB_URL): HTTP $WEB_STATUS"
    else
        echo "⚠ Web ($WEB_URL): HTTP $WEB_STATUS (CloudFront may still be propagating)"
    fi
fi

# Check Admin
if [ -n "$ADMIN_URL" ]; then
    ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL/god-mode/" --max-time 10 2>/dev/null || echo "000")
    if [ "$ADMIN_STATUS" = "200" ]; then
        echo "✓ Admin ($ADMIN_URL/god-mode/): HTTP $ADMIN_STATUS"
    else
        echo "⚠ Admin ($ADMIN_URL/god-mode/): HTTP $ADMIN_STATUS (CloudFront may still be propagating)"
    fi
fi

#######################################
# Summary
#######################################
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "========================================="
echo "DEPLOYMENT COMPLETE"
echo "========================================="
echo ""
echo "Time: ${MINUTES}m ${SECONDS}s"
echo ""
echo "URLs:"
echo "  API:   $API_URL"
echo "  Web:   $WEB_URL"
echo "  Admin: $ADMIN_URL/god-mode/"
echo ""
echo "Next steps:"
echo "  1. Verify the API health: curl $API_URL/api/health/"
echo "  2. Access the web app: $WEB_URL"
echo "  3. Access the admin: $ADMIN_URL/god-mode/"
echo ""
echo "Note: CloudFront may take 5-10 minutes to fully propagate to all edge locations."
