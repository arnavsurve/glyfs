variable "environment" {
  type = string
}
variable "app_sg_id" {
  type = string
}
variable "key_name" {
  type = string
}
variable "subnet_id" {
  type = string
}
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
variable "iam_instance_profile" {
  type        = string
  description = "IAM instance profile name for EC2"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.app_sg_id]
  key_name               = var.key_name
  iam_instance_profile   = var.iam_instance_profile

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name = "glyfs-app-${var.environment}"
  }
}

# Output the instance ID
output "output_instance_id" {
  value       = aws_instance.app.id
  description = "EC2 instance ID"
}

