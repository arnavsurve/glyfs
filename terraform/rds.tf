# RDS Configuration - Production security with private subnets
# Database isolated in private subnets, accessible only via app servers

resource "aws_db_subnet_group" "main" {
  name       = "glyfs-db-subnet-${var.environment}"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name        = "glyfs-db-subnet-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "glyfs-db-${var.environment}"

  engine         = "postgres"
  engine_version = "17.2"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "glyfs"
  username = "glyfs"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Production security: Database NOT publicly accessible
  publicly_accessible = false

  # Production backup settings
  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Production: Enable final snapshot
  skip_final_snapshot       = false
  final_snapshot_identifier = "glyfs-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  # Enable CloudWatch logs for monitoring
  enabled_cloudwatch_logs_exports = ["postgresql"]

  # Enable deletion protection in production
  deletion_protection = var.environment == "production"

  tags = {
    Name        = "glyfs-db-${var.environment}"
    Environment = var.environment
    Security    = "Private subnet - production ready"
  }
}

