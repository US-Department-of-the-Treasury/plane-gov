# ==============================================================================
# Single-Domain CloudFront Distribution
# ==============================================================================
# Routes all apps through plane.awsdev.treasury.gov:
#   /           → S3 (web app, default)
#   /god-mode/* → S3 (admin app)
#   /spaces/*   → S3 (space app)
#   /api/*      → ALB (Django API)
#   /auth/*     → ALB (Django authentication)
#   /live/*     → ALB (WebSocket)
# ==============================================================================

# Single Origin Access Control for unified distribution
resource "aws_cloudfront_origin_access_control" "unified" {
  name                              = "${var.project_name}-unified-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function to strip /god-mode prefix and handle SPA routing
resource "aws_cloudfront_function" "admin_path_rewrite" {
  name    = "${var.project_name}-admin-path-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /god-mode prefix for admin app requests"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Strip /god-mode prefix
      uri = uri.replace(/^\/god-mode/, '') || '/';

      // SPA routing: if no extension, serve index.html
      if (!uri.includes('.') || uri === '/') {
        uri = '/index.html';
      }

      request.uri = uri;
      return request;
    }
  EOF
}

# CloudFront Function to strip /spaces prefix and handle SPA routing
resource "aws_cloudfront_function" "space_path_rewrite" {
  name    = "${var.project_name}-space-path-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Strip /spaces prefix for space app requests"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // Strip /spaces prefix
      uri = uri.replace(/^\/spaces/, '') || '/';

      // SPA routing: if no extension, serve index.html
      if (!uri.includes('.') || uri === '/') {
        uri = '/index.html';
      }

      request.uri = uri;
      return request;
    }
  EOF
}

# CloudFront Function for web app SPA routing
resource "aws_cloudfront_function" "web_spa_routing" {
  name    = "${var.project_name}-web-spa-routing"
  runtime = "cloudfront-js-2.0"
  comment = "Handle SPA routing for web app"
  publish = true
  code    = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // SPA routing: if no extension, serve index.html
      if (!uri.includes('.')) {
        request.uri = '/index.html';
      }

      return request;
    }
  EOF
}

# Use AWS managed CachingDisabled policy for API
# ID: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
locals {
  managed_cache_policy_caching_disabled = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
}

# Origin request policy for API (forward all)
resource "aws_cloudfront_origin_request_policy" "api_forward_all" {
  name    = "${var.project_name}-api-forward-all"
  comment = "Forward all request data to API origin"

  cookies_config {
    cookie_behavior = "all"
  }
  headers_config {
    header_behavior = "allViewer"
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Unified CloudFront Distribution
resource "aws_cloudfront_distribution" "unified" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe
  comment             = "Treasury Plane - Unified Distribution"
  aliases             = var.domain_name != "" ? [var.domain_name] : []

  # ===========================================================================
  # Origins
  # ===========================================================================

  # Web App S3 Origin (default)
  origin {
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_id                = "S3-web"
    origin_access_control_id = aws_cloudfront_origin_access_control.unified.id
  }

  # Admin App S3 Origin
  origin {
    domain_name              = aws_s3_bucket.admin.bucket_regional_domain_name
    origin_id                = "S3-admin"
    origin_access_control_id = aws_cloudfront_origin_access_control.unified.id
  }

  # Space App S3 Origin
  origin {
    domain_name              = aws_s3_bucket.space.bucket_regional_domain_name
    origin_id                = "S3-space"
    origin_access_control_id = aws_cloudfront_origin_access_control.unified.id
  }

  # ALB Origin for API
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ===========================================================================
  # Cache Behaviors
  # ===========================================================================

  # /api/* → ALB (no caching, forward all)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.managed_cache_policy_caching_disabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # /live/* → ALB (WebSocket support, no caching)
  ordered_cache_behavior {
    path_pattern           = "/live/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = false # Don't compress WebSocket

    cache_policy_id          = local.managed_cache_policy_caching_disabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # /auth/* → ALB (authentication endpoints, no caching)
  ordered_cache_behavior {
    path_pattern           = "/auth/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = local.managed_cache_policy_caching_disabled
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # /god-mode/* → Admin S3 (with path rewrite)
  ordered_cache_behavior {
    path_pattern           = "/god-mode/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-admin"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.admin_path_rewrite.arn
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # /spaces/* → Space S3 (with path rewrite)
  ordered_cache_behavior {
    path_pattern           = "/spaces/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-space"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.space_path_rewrite.arn
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Default → Web S3 (with SPA routing)
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-web"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.web_spa_routing.arn
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

  # Custom error responses for SPA routing fallback
  # Note: These only apply to the default behavior (web app)
  # Other apps use CloudFront Functions for SPA routing
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.domain_name != "" ? aws_acm_certificate_validation.main[0].certificate_arn : null
    cloudfront_default_certificate = var.domain_name == ""
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-unified-distribution"
  }
}

# Security Headers Policy
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-security-headers"
  comment = "Security headers for Treasury compliance"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    # Updated CSP to work with single domain
    # connect-src includes S3 for presigned URL uploads
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://${var.domain_name != "" ? var.domain_name : "localhost"} https://*.s3.amazonaws.com https://*.s3.${var.aws_region}.amazonaws.com;"
      override                = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "geolocation=(), microphone=(), camera=()"
      override = true
    }
  }
}

# ==============================================================================
# DNS Record - Single domain pointing to unified distribution
# ==============================================================================

resource "aws_route53_record" "unified" {
  count   = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.unified.domain_name
    zone_id                = aws_cloudfront_distribution.unified.hosted_zone_id
    evaluate_target_health = false
  }
}

# ==============================================================================
# Legacy Resources (commented out - to be removed after migration)
# ==============================================================================

# These resources are being replaced by the unified distribution above.
# Keep them commented for reference during migration, then delete.

# resource "aws_cloudfront_origin_access_control" "web" { ... }
# resource "aws_cloudfront_origin_access_control" "admin" { ... }
# resource "aws_cloudfront_origin_access_control" "space" { ... }
# resource "aws_cloudfront_distribution" "web" { ... }
# resource "aws_cloudfront_distribution" "admin" { ... }
# resource "aws_cloudfront_distribution" "space" { ... }
# resource "aws_route53_record" "web" { ... }
# resource "aws_route53_record" "admin" { ... }
# resource "aws_route53_record" "space" { ... }
