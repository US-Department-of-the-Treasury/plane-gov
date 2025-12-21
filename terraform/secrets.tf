# Django Secret Key
resource "random_password" "django_secret" {
  length  = 50
  special = true
}

resource "aws_secretsmanager_secret" "django_secret" {
  name                    = "${var.project_name}/django-secret-key"
  description             = "Django SECRET_KEY for cryptographic signing"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-django-secret"
  }
}

resource "aws_secretsmanager_secret_version" "django_secret" {
  secret_id = aws_secretsmanager_secret.django_secret.id
  secret_string = jsonencode({
    secret_key = random_password.django_secret.result
  })
}

# OIDC Client Credentials (Login.gov)
# Values should be obtained from Login.gov dashboard
resource "aws_secretsmanager_secret" "oidc_credentials" {
  name                    = "${var.project_name}/oidc-credentials"
  description             = "OIDC client credentials for Login.gov"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-oidc-credentials"
  }
}

# Note: After creating this secret, manually add the actual credentials:
# aws secretsmanager put-secret-value \
#   --secret-id ${var.project_name}/oidc-credentials \
#   --secret-string '{"client_id":"your-client-id","client_secret":"your-client-secret"}'

# Application Configuration Secret (environment variables)
resource "aws_secretsmanager_secret" "app_config" {
  name                    = "${var.project_name}/app-config"
  description             = "Application configuration and environment variables"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-app-config"
  }
}

resource "aws_secretsmanager_secret_version" "app_config" {
  secret_id = aws_secretsmanager_secret.app_config.id
  secret_string = jsonencode({
    environment          = var.environment
    debug                = var.environment == "dev" ? "True" : "False"
    allowed_hosts        = var.domain_name != "" ? "*.${var.domain_name}" : "localhost"
    cors_allowed_origins = var.domain_name != "" ? "https://web.${var.domain_name},https://admin.${var.domain_name},https://space.${var.domain_name}" : "http://localhost:3000"
    api_url              = var.domain_name != "" ? "https://api.${var.domain_name}" : "http://localhost:8000"
    web_url              = var.domain_name != "" ? "https://web.${var.domain_name}" : "http://localhost:3000"
    enable_piv_auth      = var.enable_piv_mtls ? "True" : "False"
    admin_email          = "admin@treasury.gov"
    log_level            = var.environment == "prod" ? "INFO" : "DEBUG"
  })
}
