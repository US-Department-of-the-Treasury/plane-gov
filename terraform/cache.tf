# ElastiCache Redis (optional - consider PostgreSQL alternatives first)
#
# PostgreSQL alternatives for common Redis use cases:
# - Sessions: django.contrib.sessions.backends.db
# - Cache: PostgreSQL UNLOGGED tables
# - Job queue: pg_cron + advisory locks
# - Pub/Sub: LISTEN/NOTIFY
#
# Enable Redis only if PostgreSQL alternatives don't meet requirements.

resource "aws_elasticache_subnet_group" "redis" {
  count      = var.enable_redis ? 1 : 0
  name       = "${var.project_name}-redis"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  count                      = var.enable_redis ? 1 : 0
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cache for ${var.project_name}"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.t4g.micro"
  num_cache_clusters         = 2
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis[0].name
  security_group_ids         = [aws_security_group.redis[0].id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true
  multi_az_enabled           = true
  snapshot_retention_limit   = 5
  snapshot_window            = "03:00-05:00"
  maintenance_window         = "sun:05:00-sun:07:00"

  tags = {
    Name = "${var.project_name}-redis"
  }
}

# Redis configuration is now managed via SSM Parameter Store (see ssm.tf)
