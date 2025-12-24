# S3 Bucket for User Uploads (cover images, attachments, etc.)
# This bucket is accessed via presigned URLs from the API

resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.project_name}-uploads"
  force_destroy = true # Allow terraform destroy to delete bucket with contents

  tags = {
    Name        = "${var.project_name}-uploads"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access - all access via presigned URLs
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration for browser-based uploads via presigned URLs
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.domain_name != "" ? [
      "https://${var.domain_name}",
      "https://admin.${var.domain_name}"
    ] : [
      "http://localhost:3000",
      "http://localhost:3001"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
