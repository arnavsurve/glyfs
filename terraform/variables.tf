variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "us-west-1"
}

variable "environment" {
  type        = string
  description = "Environment name (production, staging, development)"
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "db_password" {
  type        = string
  description = "Password for RDS PostgreSQL database"
  sensitive   = true
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key for EC2 access. If empty, will try to use ~/.ssh/id_rsa.pub"
  default     = ""
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.micro"  # Changed from t3.small to save ~50% on EC2 costs
}

variable "db_instance_class" {
  type        = string
  description = "RDS instance class"
  default     = "db.t3.micro"  # Smallest RDS instance for development
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage for RDS in GB"
  default     = 20
}

variable "db_max_allocated_storage" {
  type        = number
  description = "Maximum allocated storage for RDS autoscaling in GB"
  default     = 100
}

variable "backup_retention_period" {
  type        = number
  description = "Database backup retention period in days"
  default     = 7
}

variable "tags" {
  type        = map(string)
  description = "Additional tags for all resources"
  default     = {}
}