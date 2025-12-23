# Elastic Beanstalk Application
resource "aws_elastic_beanstalk_application" "main" {
  name        = var.project_name
  description = "Treasury Plane - Project Management Platform"
}

# S3 Bucket for EB Deployments
resource "aws_s3_bucket" "eb_deployments" {
  bucket        = "${var.project_name}-eb-deployments"
  force_destroy = true

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

# Create placeholder application files
resource "local_file" "placeholder_app" {
  filename = "${path.module}/placeholder-app/application.py"
  content  = <<-EOF
    """
    Minimal placeholder WSGI application for Elastic Beanstalk.
    This gets replaced by the real application via deploy-backend.sh.
    """

    def application(environ, start_response):
        """WSGI application that passes health checks."""
        path = environ.get('PATH_INFO', '/')

        if path == '/api/v1/health/':
            # Health check endpoint
            status = '200 OK'
            body = b'{"status": "placeholder"}'
            headers = [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(body)))
            ]
        elif path == '/':
            # Root path for ALB health checks
            status = '200 OK'
            body = b'Placeholder - deploy real application with deploy-backend.sh'
            headers = [
                ('Content-Type', 'text/plain'),
                ('Content-Length', str(len(body)))
            ]
        else:
            status = '404 Not Found'
            body = b'Placeholder app - deploy real application'
            headers = [
                ('Content-Type', 'text/plain'),
                ('Content-Length', str(len(body)))
            ]

        start_response(status, headers)
        return [body]
  EOF
}

resource "local_file" "placeholder_requirements" {
  filename = "${path.module}/placeholder-app/requirements.txt"
  content  = "# Minimal placeholder - no dependencies needed\n"
}

resource "local_file" "placeholder_procfile" {
  filename = "${path.module}/placeholder-app/Procfile"
  content  = "web: gunicorn --bind 0.0.0.0:8000 application:application\n"
}

resource "local_file" "placeholder_gunicorn_req" {
  filename = "${path.module}/placeholder-app/.ebextensions/01-packages.config"
  content  = <<-EOF
    packages:
      yum:
        python3-devel: []

    container_commands:
      01_install_gunicorn:
        command: "pip install gunicorn"
  EOF
}

# Create the zip archive from the placeholder files
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder-app.zip"

  source {
    content  = local_file.placeholder_app.content
    filename = "application.py"
  }

  source {
    content  = local_file.placeholder_requirements.content
    filename = "requirements.txt"
  }

  source {
    content  = local_file.placeholder_procfile.content
    filename = "Procfile"
  }

  source {
    content  = local_file.placeholder_gunicorn_req.content
    filename = ".ebextensions/01-packages.config"
  }

  depends_on = [
    local_file.placeholder_app,
    local_file.placeholder_requirements,
    local_file.placeholder_procfile,
    local_file.placeholder_gunicorn_req,
  ]
}

# Upload the placeholder zip to S3
resource "aws_s3_object" "eb_placeholder" {
  bucket = aws_s3_bucket.eb_deployments.id
  key    = "placeholder-${data.archive_file.placeholder.output_md5}.zip"
  source = data.archive_file.placeholder.output_path
  etag   = data.archive_file.placeholder.output_md5

  tags = {
    Name = "placeholder"
  }
}

# Application Version pointing to the valid placeholder
resource "aws_elastic_beanstalk_application_version" "default" {
  name        = "${var.project_name}-placeholder-${substr(data.archive_file.placeholder.output_md5, 0, 8)}"
  application = aws_elastic_beanstalk_application.main.name
  description = "Valid placeholder that passes health checks"
  bucket      = aws_s3_bucket.eb_deployments.id
  key         = aws_s3_object.eb_placeholder.key
}
