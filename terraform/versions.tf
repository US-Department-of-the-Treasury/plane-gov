terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # For production, configure S3 backend:
  # backend "s3" {
  #   bucket         = "treasury-terraform-state"
  #   key            = "plane/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Treasury-Plane"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Compliance  = "Treasury-ATO"
    }
  }
}
