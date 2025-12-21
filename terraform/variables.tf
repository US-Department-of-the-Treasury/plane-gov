variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "treasury-plane"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "enable_redis" {
  description = "Enable ElastiCache Redis (consider PostgreSQL alternatives first)"
  type        = bool
  default     = false
}

variable "eb_instance_type" {
  description = "EC2 instance type for Elastic Beanstalk"
  type        = string
  default     = "t3.small"
}

variable "eb_min_instances" {
  description = "Minimum number of EB instances"
  type        = number
  default     = 2
}

variable "eb_max_instances" {
  description = "Maximum number of EB instances"
  type        = number
  default     = 4
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "plane"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "plane_admin"
  sensitive   = true
}

variable "enable_piv_mtls" {
  description = "Enable PIV/CAC mutual TLS on ALB"
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Domain name for ACM certificate (e.g., plane.awsdev.treasury.gov)"
  type        = string
  default     = "plane.awsdev.treasury.gov"
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records"
  type        = string
  default     = ""
}
