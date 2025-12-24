# Elastic Beanstalk Environment
resource "aws_elastic_beanstalk_environment" "main" {
  name                = "${var.project_name}-${var.environment}"
  application         = aws_elastic_beanstalk_application.main.name
  solution_stack_name = "64bit Amazon Linux 2023 v4.9.0 running Python 3.11"
  tier                = "WebServer"
  version_label       = aws_elastic_beanstalk_application_version.default.name

  # VPC Configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", aws_subnet.private[*].id)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", aws_subnet.public[*].id)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "false"
  }

  # Load Balancer Configuration (attach to existing ALB)
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "SharedLoadBalancer"
    value     = aws_lb.main.arn
  }

  setting {
    namespace = "aws:elbv2:listener:default"
    name      = "ListenerEnabled"
    value     = "false" # Using ALB listeners defined in alb.tf
  }

  setting {
    namespace = "aws:elbv2:listenerrule:default"
    name      = "PathPatterns"
    value     = "/*"
  }

  setting {
    namespace = "aws:elbv2:listenerrule:default"
    name      = "Priority"
    value     = "1"
  }

  # Auto Scaling Configuration
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = var.eb_min_instances
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = var.eb_max_instances
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.eb_instance_type
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.eb.id
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb_ec2.name
  }

  # Health Check Configuration
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckPath"
    value     = "/"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckInterval"
    value     = "30"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthCheckTimeout"
    value     = "5"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "HealthyThresholdCount"
    value     = "2"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "UnhealthyThresholdCount"
    value     = "3"
  }

  # Sticky Sessions for WebSocket
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "StickinessEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "StickinessLBCookieDuration"
    value     = "86400"
  }

  # Environment Variables
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_REGION"
    value     = var.aws_region
  }

  # SSM Parameter Store configuration (new approach)
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PROJECT"
    value     = var.project_name
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ENVIRONMENT"
    value     = var.environment
  }

  # Legacy Secrets Manager ARNs (kept during migration, remove after validation)
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "APP_CONFIG_SECRET_ARN"
    value     = aws_secretsmanager_secret.app_config.arn
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DB_SECRET_ARN"
    value     = aws_secretsmanager_secret.db_credentials.arn
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DJANGO_SECRET_ARN"
    value     = aws_secretsmanager_secret.django_secret.arn
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "OIDC_SECRET_ARN"
    value     = aws_secretsmanager_secret.oidc_credentials.arn
  }

  # Redis URL (if enabled)
  dynamic "setting" {
    for_each = var.enable_redis ? [1] : []
    content {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = "REDIS_URL"
      value     = "rediss://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379/0"
    }
  }

  # CloudWatch Logs
  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "StreamLogs"
    value     = "true"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "DeleteOnTerminate"
    value     = var.environment == "dev" ? "true" : "false"
  }

  setting {
    namespace = "aws:elasticbeanstalk:cloudwatch:logs"
    name      = "RetentionInDays"
    value     = var.environment == "prod" ? "90" : "7"
  }

  # Enhanced Health Reporting
  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "SystemType"
    value     = "enhanced"
  }

  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "EnhancedHealthAuthEnabled"
    value     = "true"
  }

  # Rolling Updates
  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateEnabled"
    value     = "true"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "RollingUpdateType"
    value     = "Health"
  }

  setting {
    namespace = "aws:autoscaling:updatepolicy:rollingupdate"
    name      = "MinInstancesInService"
    value     = var.eb_min_instances
  }

  # Deployment Policy (AllAtOnce for debugging, change to Rolling for production)
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "AllAtOnce"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "50"
  }

  # Managed Platform Updates (disabled - requires custom IAM role with AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy)
  setting {
    namespace = "aws:elasticbeanstalk:managedactions"
    name      = "ManagedActionsEnabled"
    value     = "false"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }

  # Prevent recreation due to subnet order drift and application version changes
  # We deploy application versions via scripts (deploy-backend.sh), not Terraform
  lifecycle {
    ignore_changes = [
      setting,        # EB manages many settings automatically
      version_label,  # We deploy versions via deploy-backend.sh, not terraform
      tags,           # Tags may be modified by AWS
      tags_all,       # Tags may be modified by AWS
    ]
  }
}

# Fix ALB listener to point to EB-managed target group
# When using SharedLoadBalancer, EB creates its own target group with the instances.
# We need to update our HTTPS listener to forward to EB's target group.
resource "null_resource" "fix_alb_listener" {
  count = var.domain_name != "" ? 1 : 0

  triggers = {
    eb_environment = aws_elastic_beanstalk_environment.main.id
  }

  provisioner "local-exec" {
    command = <<-EOF
      # Wait for EB to create its target group
      sleep 30

      # Find EB's target group (starts with awseb-)
      EB_TG_ARN=$(aws elbv2 describe-target-groups \
        --query 'TargetGroups[?starts_with(TargetGroupName, `awseb-`) && VpcId==`${aws_vpc.main.id}`].TargetGroupArn | [0]' \
        --output text 2>/dev/null)

      if [ "$EB_TG_ARN" != "None" ] && [ -n "$EB_TG_ARN" ]; then
        # Get HTTPS listener ARN (port 443)
        LISTENER_ARN=$(aws elbv2 describe-listeners \
          --load-balancer-arn ${aws_lb.main.arn} \
          --query 'Listeners[?Port==`443`].ListenerArn | [0]' \
          --output text 2>/dev/null)

        if [ -n "$LISTENER_ARN" ] && [ "$LISTENER_ARN" != "None" ]; then
          # Update listener to forward to EB's target group
          aws elbv2 modify-listener \
            --listener-arn "$LISTENER_ARN" \
            --default-actions Type=forward,TargetGroupArn="$EB_TG_ARN" \
            --output json > /dev/null 2>&1
          echo "Updated HTTPS listener to use EB target group: $EB_TG_ARN"
        else
          echo "HTTPS listener not found"
        fi
      else
        echo "EB target group not found yet"
      fi
    EOF
  }

  depends_on = [
    aws_elastic_beanstalk_environment.main,
    aws_lb_listener.https
  ]
}
