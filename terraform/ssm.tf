# SSM Parameter Store for application secrets
# Replaces Secrets Manager JSON blobs with individual parameters
# Naming convention: /{project_name}/{environment}/{parameter-name}

locals {
  ssm_prefix = "/${var.project_name}/${var.environment}"
}

# =============================================================================
# Database
# =============================================================================

# Database connection URL (constructed from Aurora outputs)
resource "aws_ssm_parameter" "database_url" {
  name        = "${local.ssm_prefix}/database-url"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_rds_cluster.aurora.endpoint}:5432/${var.db_name}"
  description = "PostgreSQL connection URL for Django"

  tags = {
    Name        = "${var.project_name}-database-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value] # Don't overwrite manual credential rotations
  }
}

# =============================================================================
# Django
# =============================================================================

# Django SECRET_KEY
resource "aws_ssm_parameter" "secret_key" {
  name        = "${local.ssm_prefix}/secret-key"
  type        = "SecureString"
  value       = random_password.django_secret.result
  description = "Django SECRET_KEY for cryptographic signing"

  tags = {
    Name        = "${var.project_name}-secret-key"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# Redis (if enabled)
# =============================================================================

resource "aws_ssm_parameter" "redis_url" {
  count = var.enable_redis ? 1 : 0

  name        = "${local.ssm_prefix}/redis-url"
  type        = "SecureString"
  value       = "rediss://${aws_elasticache_replication_group.redis[0].primary_endpoint_address}:6379/0"
  description = "Redis connection URL for caching and Celery"

  tags = {
    Name        = "${var.project_name}-redis-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# Application URLs (non-sensitive)
# =============================================================================

resource "aws_ssm_parameter" "web_url" {
  name        = "${local.ssm_prefix}/web-url"
  type        = "String"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:3000"
  description = "Web application URL"

  tags = {
    Name        = "${var.project_name}-web-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "api_base_url" {
  name        = "${local.ssm_prefix}/api-base-url"
  type        = "String"
  value       = var.domain_name != "" ? "https://${var.domain_name}/api" : "http://localhost:8000"
  description = "API base URL"

  tags = {
    Name        = "${var.project_name}-api-base-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "admin_base_url" {
  name        = "${local.ssm_prefix}/admin-base-url"
  type        = "String"
  value       = var.domain_name != "" ? "https://${var.domain_name}/god-mode" : "http://localhost:3001"
  description = "Admin panel URL"

  tags = {
    Name        = "${var.project_name}-admin-base-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "space_base_url" {
  name        = "${local.ssm_prefix}/space-base-url"
  type        = "String"
  value       = var.domain_name != "" ? "https://${var.domain_name}/spaces" : "http://localhost:3002"
  description = "Space application URL"

  tags = {
    Name        = "${var.project_name}-space-base-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# CORS and Security (non-sensitive)
# =============================================================================

resource "aws_ssm_parameter" "cors_allowed_origins" {
  name        = "${local.ssm_prefix}/cors-allowed-origins"
  type        = "String"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://localhost:3000,http://localhost:3001,http://localhost:3002"
  description = "CORS allowed origins"

  tags = {
    Name        = "${var.project_name}-cors-allowed-origins"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "allowed_hosts" {
  name        = "${local.ssm_prefix}/allowed-hosts"
  type        = "String"
  value       = var.domain_name != "" ? ".${var.domain_name}" : "localhost,127.0.0.1"
  description = "Django ALLOWED_HOSTS"

  tags = {
    Name        = "${var.project_name}-allowed-hosts"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_ssm_parameter" "debug" {
  name        = "${local.ssm_prefix}/debug"
  type        = "String"
  value       = var.environment == "dev" ? "1" : "0"
  description = "Django DEBUG setting (1=enabled, 0=disabled)"

  tags = {
    Name        = "${var.project_name}-debug"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# =============================================================================
# OIDC/PIV Authentication (placeholders - update via AWS CLI or console)
# =============================================================================

resource "aws_ssm_parameter" "is_oidc_enabled" {
  name        = "${local.ssm_prefix}/is-oidc-enabled"
  type        = "String"
  value       = "0" # Set to "1" after configuring OIDC credentials
  description = "Enable OIDC/PIV authentication (0=disabled, 1=enabled)"

  tags = {
    Name        = "${var.project_name}-is-oidc-enabled"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value] # Allow manual updates without Terraform override
  }
}

resource "aws_ssm_parameter" "oidc_provider_name" {
  name        = "${local.ssm_prefix}/oidc-provider-name"
  type        = "String"
  value       = "PIV Card"
  description = "Display name for OIDC provider on login screen"

  tags = {
    Name        = "${var.project_name}-oidc-provider-name"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "oidc_client_id" {
  name        = "${local.ssm_prefix}/oidc-client-id"
  type        = "String"
  value       = "placeholder" # Update via: aws ssm put-parameter --name "..." --value "actual-client-id" --overwrite
  description = "OIDC Client ID (update manually after Terraform apply)"

  tags = {
    Name        = "${var.project_name}-oidc-client-id"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value] # Allow manual updates without Terraform override
  }
}

resource "aws_ssm_parameter" "oidc_client_secret" {
  name        = "${local.ssm_prefix}/oidc-client-secret"
  type        = "SecureString"
  value       = "placeholder" # Update via: aws ssm put-parameter --name "..." --value "actual-secret" --type SecureString --overwrite
  description = "OIDC Client Secret (update manually after Terraform apply)"

  tags = {
    Name        = "${var.project_name}-oidc-client-secret"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value] # Allow manual updates without Terraform override
  }
}

resource "aws_ssm_parameter" "oidc_authorization_url" {
  name        = "${local.ssm_prefix}/oidc-authorization-url"
  type        = "String"
  value       = "not-configured" # Set via AWS CLI when configuring OIDC
  description = "OIDC Authorization endpoint URL"

  tags = {
    Name        = "${var.project_name}-oidc-authorization-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "oidc_token_url" {
  name        = "${local.ssm_prefix}/oidc-token-url"
  type        = "String"
  value       = "not-configured" # Set via AWS CLI when configuring OIDC
  description = "OIDC Token endpoint URL"

  tags = {
    Name        = "${var.project_name}-oidc-token-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "oidc_userinfo_url" {
  name        = "${local.ssm_prefix}/oidc-userinfo-url"
  type        = "String"
  value       = "not-configured" # Set via AWS CLI when configuring OIDC
  description = "OIDC UserInfo endpoint URL"

  tags = {
    Name        = "${var.project_name}-oidc-userinfo-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "oidc_issuer_url" {
  name        = "${local.ssm_prefix}/oidc-issuer-url"
  type        = "String"
  value       = "not-configured" # Set via AWS CLI when configuring OIDC
  description = "OIDC Issuer URL"

  tags = {
    Name        = "${var.project_name}-oidc-issuer-url"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "oidc_scope" {
  name        = "${local.ssm_prefix}/oidc-scope"
  type        = "String"
  value       = "openid"
  description = "OIDC scope (default: openid)"

  tags = {
    Name        = "${var.project_name}-oidc-scope"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

# =============================================================================
# S3 Storage
# =============================================================================

resource "aws_ssm_parameter" "aws_s3_bucket_name" {
  name        = "${local.ssm_prefix}/aws-s3-bucket-name"
  type        = "String"
  value       = aws_s3_bucket.uploads.id
  description = "S3 bucket name for file uploads (cover images, attachments)"

  tags = {
    Name        = "${var.project_name}-aws-s3-bucket-name"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
