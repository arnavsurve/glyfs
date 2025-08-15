# IAM Role for EC2 to access ECR
resource "aws_iam_role" "ec2_ecr_role" {
  name = "glyfs-ec2-ecr-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "glyfs-ec2-ecr-role-${var.environment}"
    Environment = var.environment
  }
}

# Policy to allow ECR access
resource "aws_iam_role_policy" "ec2_ecr_policy" {
  name = "glyfs-ec2-ecr-policy-${var.environment}"
  role = aws_iam_role.ec2_ecr_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Instance profile to attach the role to EC2
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "glyfs-ec2-profile-${var.environment}"
  role = aws_iam_role.ec2_ecr_role.name

  tags = {
    Name        = "glyfs-ec2-profile-${var.environment}"
    Environment = var.environment
  }
}