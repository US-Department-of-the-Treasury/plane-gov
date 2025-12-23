# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Database Outputs
output "aurora_endpoint" {
  description = "Aurora cluster endpoint"
  value       = aws_rds_cluster.aurora.endpoint
}

output "aurora_reader_endpoint" {
  description = "Aurora cluster reader endpoint"
  value       = aws_rds_cluster.aurora.reader_endpoint
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for database credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = var.enable_redis ? aws_elasticache_replication_group.redis[0].primary_endpoint_address : "Not enabled"
}

output "redis_reader_endpoint" {
  description = "ElastiCache Redis reader endpoint"
  value       = var.enable_redis ? aws_elasticache_replication_group.redis[0].reader_endpoint_address : "Not enabled"
}

# Load Balancer Outputs
output "alb_name" {
  description = "ALB name"
  value       = aws_lb.main.name
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_zone_id" {
  description = "ALB Hosted Zone ID"
  value       = aws_lb.main.zone_id
}

# Elastic Beanstalk Outputs
output "eb_application_name" {
  description = "Elastic Beanstalk application name"
  value       = aws_elastic_beanstalk_application.main.name
}

output "eb_environment_name" {
  description = "Elastic Beanstalk environment name"
  value       = aws_elastic_beanstalk_environment.main.name
}

output "eb_environment_url" {
  description = "Elastic Beanstalk environment URL"
  value       = aws_elastic_beanstalk_environment.main.endpoint_url
}

output "eb_bucket_name" {
  description = "S3 bucket for EB deployments"
  value       = aws_s3_bucket.eb_deployments.id
}

# S3 Frontend Buckets
output "web_bucket" {
  description = "S3 bucket for web frontend"
  value       = aws_s3_bucket.web.id
}

output "admin_bucket" {
  description = "S3 bucket for admin frontend"
  value       = aws_s3_bucket.admin.id
}

output "space_bucket" {
  description = "S3 bucket for space frontend"
  value       = aws_s3_bucket.space.id
}

# ==============================================================================
# Unified CloudFront Distribution Outputs
# ==============================================================================

output "cloudfront_domain" {
  description = "CloudFront domain for unified distribution"
  value       = aws_cloudfront_distribution.unified.domain_name
}

output "cloudfront_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.unified.id
}

# ==============================================================================
# Single-Domain URL Outputs
# ==============================================================================
# All apps are served from the same domain with path-based routing:
#   /           → Web app
#   /god-mode/* → Admin app
#   /spaces/*   → Space app
#   /api/*      → API
#   /live/*     → WebSocket
# ==============================================================================

output "base_url" {
  description = "Base URL for all Plane apps (single domain)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.unified.domain_name}"
}

output "api_url" {
  description = "API endpoint URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}/api" : "https://${aws_cloudfront_distribution.unified.domain_name}/api"
}

output "web_url" {
  description = "Web app URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.unified.domain_name}"
}

output "admin_url" {
  description = "Admin app URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}/god-mode" : "https://${aws_cloudfront_distribution.unified.domain_name}/god-mode"
}

output "space_url" {
  description = "Space app URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}/spaces" : "https://${aws_cloudfront_distribution.unified.domain_name}/spaces"
}

output "live_url" {
  description = "WebSocket (live) URL"
  value       = var.domain_name != "" ? "wss://${var.domain_name}/live" : "wss://${aws_cloudfront_distribution.unified.domain_name}/live"
}

# Secrets Manager ARNs
output "django_secret_arn" {
  description = "Secrets Manager ARN for Django secret key"
  value       = aws_secretsmanager_secret.django_secret.arn
  sensitive   = true
}

output "oidc_secret_arn" {
  description = "Secrets Manager ARN for OIDC credentials"
  value       = aws_secretsmanager_secret.oidc_credentials.arn
  sensitive   = true
}

output "app_config_secret_arn" {
  description = "Secrets Manager ARN for application config"
  value       = aws_secretsmanager_secret.app_config.arn
  sensitive   = true
}

# Security Group IDs
output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "eb_security_group_id" {
  description = "Elastic Beanstalk security group ID"
  value       = aws_security_group.eb.id
}

output "aurora_security_group_id" {
  description = "Aurora security group ID"
  value       = aws_security_group.aurora.id
}

# IAM Role ARNs
output "eb_ec2_role_arn" {
  description = "IAM role ARN for EB EC2 instances"
  value       = aws_iam_role.eb_ec2.arn
}

output "eb_service_role_arn" {
  description = "IAM role ARN for EB service"
  value       = aws_iam_role.eb_service.arn
}
