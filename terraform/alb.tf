# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"
  enable_http2               = true
  enable_waf_fail_open       = false

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# Route53 alias for ALB - used by CloudFront to connect over HTTPS
# The wildcard certificate (*.domain_name) covers this subdomain
resource "aws_route53_record" "alb_alias" {
  count   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "api-alb.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Target Group for Django API
resource "aws_lb_target_group" "django" {
  name                 = "${var.project_name}-django"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  stickiness {
    enabled         = true
    type            = "lb_cookie"
    cookie_duration = 86400 # 24 hours for WebSocket support
  }

  tags = {
    Name = "${var.project_name}-django-tg"
  }
}

# ACM Certificate (if domain provided)
resource "aws_acm_certificate" "main" {
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}" # Wildcard for web, admin, space subdomains
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-certificate"
  }
}

# DNS validation for ACM certificate
# Note: Wildcard and main domain share the same CNAME, so we key by record name to deduplicate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = var.route53_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.record]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  count                   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# S3 bucket for PIV trust store certificates
resource "aws_s3_bucket" "piv_trust_store" {
  count  = var.enable_piv_mtls ? 1 : 0
  bucket = "${var.project_name}-piv-trust-store"

  tags = {
    Name = "${var.project_name}-piv-trust-store"
  }
}

resource "aws_s3_bucket_versioning" "piv_trust_store" {
  count  = var.enable_piv_mtls ? 1 : 0
  bucket = aws_s3_bucket.piv_trust_store[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

# Upload a placeholder certificate (will be replaced with Federal PKI certs)
# Generate a self-signed CA cert for initial setup
resource "aws_s3_object" "piv_ca_bundle" {
  count   = var.enable_piv_mtls ? 1 : 0
  bucket  = aws_s3_bucket.piv_trust_store[0].id
  key     = "federal-pki-ca-bundle.pem"
  content = <<-EOT
# Placeholder - Replace with Federal Common Policy CA bundle
# Download from: https://repo.fpki.gov/bridge/caCertsIssuedTofbca.p7b
# Convert: openssl pkcs7 -print_certs -in caCertsIssuedTofbca.p7b -out federal-pki-ca-bundle.pem
EOT

  tags = {
    Name = "${var.project_name}-piv-ca-bundle"
  }
}

# PIV/CAC Trust Store (Federal Common Policy CA)
# Note: Initial deployment uses placeholder. Update with real Federal PKI certs:
#   aws s3 cp federal-pki-ca-bundle.pem s3://treasury-plane-piv-trust-store/
resource "aws_lb_trust_store" "piv" {
  count = var.enable_piv_mtls ? 1 : 0
  name  = "${var.project_name}-piv-trust-store"

  ca_certificates_bundle_s3_bucket = aws_s3_bucket.piv_trust_store[0].id
  ca_certificates_bundle_s3_key    = aws_s3_object.piv_ca_bundle[0].key

  tags = {
    Name = "${var.project_name}-piv-trust-store"
  }

  depends_on = [aws_s3_object.piv_ca_bundle]
}

# HTTPS Listener with mTLS
resource "aws_lb_listener" "https" {
  count             = var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.django.arn
  }

  # When using shared ALB with Elastic Beanstalk, EB manages the target group
  # and updates this listener. We ignore changes to default_action to prevent
  # Terraform from reverting EB's configuration.
  lifecycle {
    ignore_changes = [default_action]
  }

  # Mutual TLS configuration (if enabled)
  dynamic "mutual_authentication" {
    for_each = var.enable_piv_mtls ? [1] : []
    content {
      mode                             = "verify"
      trust_store_arn                  = aws_lb_trust_store.piv[0].arn
      ignore_client_certificate_expiry = false
    }
  }

  tags = {
    Name = "${var.project_name}-https-listener"
  }
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name = "${var.project_name}-http-listener"
  }
}

# NOTE: API is now routed through the unified CloudFront distribution at /api/*
# The api.${domain} subdomain record has been removed.
# See terraform/cloudfront.tf for the unified distribution configuration.
