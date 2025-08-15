# Elastic IP for consistent public IP address
resource "aws_eip" "app" {
  domain = "vpc"
  
  tags = {
    Name        = "glyfs-eip-${var.environment}"
    Environment = var.environment
  }
}

# Associate Elastic IP with EC2 instance
resource "aws_eip_association" "app" {
  instance_id   = module.ec2.instance_id
  allocation_id = aws_eip.app.id
}

# Output the Elastic IP
output "elastic_ip" {
  value       = aws_eip.app.public_ip
  description = "Elastic IP address for the application"
}

output "elastic_ip_dns" {
  value       = aws_eip.app.public_dns
  description = "Public DNS for the Elastic IP"
}