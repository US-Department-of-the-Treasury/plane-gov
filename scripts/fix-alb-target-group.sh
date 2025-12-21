#!/bin/bash
set -e

# Fix ALB Target Group after Elastic Beanstalk deployment
#
# ISSUE: When using shared ALB with EB, Terraform creates a listener pointing
# to our target group, but EB creates its own target group with instances.
# This script updates the ALB listener to use EB's target group.
#
# This is a known limitation of the shared ALB + EB architecture.
# Run this script after terraform apply and deploy-backend.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$REPO_ROOT/terraform"

cd "$TERRAFORM_DIR"

echo "========================================="
echo "Fix ALB Target Group for EB"
echo "========================================="

# Get ALB ARN
ALB_NAME=$(terraform output -raw alb_name 2>/dev/null) || {
    echo "Error: Could not get ALB name from Terraform outputs"
    exit 1
}

ALB_ARN=$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].LoadBalancerArn' --output text)
echo "ALB: $ALB_NAME"

# Get HTTPS listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`443`].ListenerArn' --output text)
if [ -z "$LISTENER_ARN" ]; then
    echo "Error: No HTTPS listener found on ALB"
    exit 1
fi
echo "HTTPS Listener: $LISTENER_ARN"

# Find EB's target group (starts with awseb-)
EB_TG_ARN=$(aws elbv2 describe-target-groups --query 'TargetGroups[?starts_with(TargetGroupName, `awseb-`)].TargetGroupArn' --output text | head -1)
if [ -z "$EB_TG_ARN" ]; then
    echo "Error: Could not find EB target group (awseb-*)"
    echo "Make sure Elastic Beanstalk environment is deployed"
    exit 1
fi
echo "EB Target Group: $EB_TG_ARN"

# Check if EB target group has healthy targets
HEALTHY_TARGETS=$(aws elbv2 describe-target-health --target-group-arn "$EB_TG_ARN" --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`]' --output json | jq length)
echo "Healthy targets: $HEALTHY_TARGETS"

if [ "$HEALTHY_TARGETS" -eq 0 ]; then
    echo ""
    echo "Warning: EB target group has no healthy targets yet."
    echo "The instances may still be initializing. Proceeding anyway..."
fi

# Get current listener target group
CURRENT_TG=$(aws elbv2 describe-listeners --listener-arns "$LISTENER_ARN" --query 'Listeners[0].DefaultActions[0].TargetGroupArn' --output text)
echo "Current listener target: $CURRENT_TG"

if [ "$CURRENT_TG" = "$EB_TG_ARN" ]; then
    echo ""
    echo "Listener already points to EB target group. No changes needed."
    exit 0
fi

# Update the listener
echo ""
echo "Updating listener to use EB target group..."
aws elbv2 modify-listener \
    --listener-arn "$LISTENER_ARN" \
    --default-actions Type=forward,TargetGroupArn="$EB_TG_ARN" \
    --output text > /dev/null

echo ""
echo "========================================="
echo "ALB Target Group Fixed!"
echo "========================================="
echo ""

# Verify by waiting for targets to become healthy
echo "Waiting for targets to become healthy (up to 60s)..."
for i in {1..12}; do
    HEALTHY=$(aws elbv2 describe-target-health --target-group-arn "$EB_TG_ARN" --query 'TargetHealthDescriptions[?TargetHealth.State==`healthy`]' --output json | jq length)
    if [ "$HEALTHY" -gt 0 ]; then
        echo "Targets are healthy!"
        break
    fi
    sleep 5
done

# Final verification
API_URL=$(terraform output -raw api_url 2>/dev/null) || API_URL="(unknown)"
echo ""
echo "Verifying API endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" --max-time 10 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "API is accessible (HTTP $HTTP_STATUS)"
else
    echo "Warning: API returned HTTP $HTTP_STATUS (may need a moment to stabilize)"
fi
