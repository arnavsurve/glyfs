resource "aws_ecr_repository" "glyfs" {
  name                 = "glyfs"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle {
    prevent_destroy = false
  }

  tags = {
    Name        = "glyfs-ecr-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "glyfs" {
  repository = aws_ecr_repository.glyfs.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.glyfs.repository_url
  description = "URL of the ECR repository"
}

output "ecr_registry" {
  value       = split("/", aws_ecr_repository.glyfs.repository_url)[0]
  description = "ECR registry URL"
}

