resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "aurora" {
  name       = "${var.project_name}-aurora"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-aurora-subnet-group"
  }
}

resource "aws_rds_cluster_parameter_group" "aurora" {
  family = "aurora-postgresql15"
  name   = "${var.project_name}-aurora-params"

  # Enable pg_cron for background jobs (PostgreSQL-first architecture)
  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_cron"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "cron.database_name"
    value        = var.db_name
    apply_method = "pending-reboot"
  }

  # Connection pooling optimization
  parameter {
    name         = "max_connections"
    value        = "LEAST({DBInstanceClassMemory/9531392},5000)"
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${var.project_name}-aurora-params"
  }
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier              = "${var.project_name}-aurora"
  engine                          = "aurora-postgresql"
  engine_mode                     = "provisioned"
  engine_version                  = "15.12"
  database_name                   = var.db_name
  master_username                 = var.db_username
  master_password                 = random_password.db_password.result
  storage_encrypted               = true
  backup_retention_period         = 7
  preferred_backup_window         = "03:00-04:00"
  preferred_maintenance_window    = "sun:04:00-sun:05:00"
  skip_final_snapshot             = var.environment != "prod"
  final_snapshot_identifier       = var.environment == "prod" ? "${var.project_name}-final-snapshot" : null
  enabled_cloudwatch_logs_exports = ["postgresql"]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora.name

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 4.0
  }

  vpc_security_group_ids = [aws_security_group.aurora.id]
  db_subnet_group_name   = aws_db_subnet_group.aurora.name

  tags = {
    Name = "${var.project_name}-aurora"
  }
}

resource "aws_rds_cluster_instance" "aurora" {
  identifier                   = "${var.project_name}-aurora-instance-1"
  cluster_identifier           = aws_rds_cluster.aurora.id
  instance_class               = "db.serverless"
  engine                       = aws_rds_cluster.aurora.engine
  engine_version               = aws_rds_cluster.aurora.engine_version
  publicly_accessible          = false
  performance_insights_enabled = true

  tags = {
    Name = "${var.project_name}-aurora-instance"
  }
}

# Store database credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/db-credentials"
  description             = "Aurora PostgreSQL database credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name = "${var.project_name}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_rds_cluster.aurora.endpoint
    port     = 5432
    dbname   = var.db_name
    engine   = "postgres"
  })
}
