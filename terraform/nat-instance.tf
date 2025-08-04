# NAT Instance - Cost-effective alternative to NAT Gateway
# Provides outbound internet access for private subnets
# Cost: ~$3.50/month vs $45/month for NAT Gateway

# Data source to get latest Amazon Linux 2 AMI (we'll configure NAT ourselves)
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security group for NAT instance
resource "aws_security_group" "nat" {
  name        = "glyfs-nat-sg-${var.environment}"
  description = "Security group for NAT instance"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP/HTTPS outbound from private subnets
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private_a.cidr_block, aws_subnet.private_b.cidr_block]
    description = "HTTP from private subnets"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private_a.cidr_block, aws_subnet.private_b.cidr_block]
    description = "HTTPS from private subnets"
  }

  # Allow all protocols for comprehensive NAT functionality
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private_a.cidr_block, aws_subnet.private_b.cidr_block]
    description = "All TCP from private subnets"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "glyfs-nat-sg-${var.environment}"
    Environment = var.environment
  }
}

# NAT Instance - t3.nano for cost optimization
resource "aws_instance" "nat" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.nano"  # x86, ~$3.50/month
  subnet_id     = aws_subnet.public_a.id

  vpc_security_group_ids = [aws_security_group.nat.id]

  # Critical: Disable source/destination check for NAT functionality
  source_dest_check = false

  # User data to configure NAT functionality
  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum update -y
    echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
    sysctl -p /etc/sysctl.conf
    
    # Configure iptables for NAT
    /sbin/iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    /sbin/iptables -F FORWARD
    /sbin/iptables -A FORWARD -j ACCEPT
    
    # Save iptables rules
    /sbin/service iptables save
    
    # Enable CloudWatch monitoring
    yum install -y awslogs
    systemctl start awslogsd
    systemctl enable awslogsd
    
    # Create health check endpoint
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    echo "NAT Instance Healthy" > /var/www/html/health
    
    echo "NAT instance setup completed" >> /var/log/user-data.log
  EOF
  )

  tags = {
    Name        = "glyfs-nat-${var.environment}"
    Environment = var.environment
    Role        = "NAT"
    Cost        = "~$3.50/month"
  }
}

# Elastic IP for NAT instance (optional but recommended for production)
resource "aws_eip" "nat" {
  instance = aws_instance.nat.id
  domain   = "vpc"

  tags = {
    Name        = "glyfs-nat-eip-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}