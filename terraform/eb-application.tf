# Elastic Beanstalk Application
resource "aws_elastic_beanstalk_application" "main" {
  name        = var.project_name
  description = "Treasury Plane - Project Management Platform"
  # Note: Tags from provider default_tags are applied automatically
}

# Application Version (initial placeholder)
# Actual application code deployed via deploy-backend.sh script
resource "aws_elastic_beanstalk_application_version" "default" {
  name        = "${var.project_name}-v1"
  application = aws_elastic_beanstalk_application.main.name
  description = "Initial placeholder version"
  bucket      = aws_s3_bucket.eb_deployments.id
  key         = aws_s3_object.eb_placeholder.id
  # Note: Tags from provider default_tags are applied automatically
}

# S3 Bucket for EB Deployments
resource "aws_s3_bucket" "eb_deployments" {
  bucket = "${var.project_name}-eb-deployments"

  tags = {
    Name = "${var.project_name}-eb-deployments"
  }
}

resource "aws_s3_bucket_versioning" "eb_deployments" {
  bucket = aws_s3_bucket.eb_deployments.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "eb_deployments" {
  bucket = aws_s3_bucket.eb_deployments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Placeholder deployment package
resource "aws_s3_object" "eb_placeholder" {
  bucket  = aws_s3_bucket.eb_deployments.id
  key     = "placeholder.zip"
  content = "# Placeholder - deploy with EB CLI"

  tags = {
    Name = "placeholder"
  }
}
