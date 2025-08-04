resource "aws_key_pair" "app" {
  key_name   = "glyfs-key-${var.environment}"
  public_key = var.ssh_public_key != "" ? var.ssh_public_key : file("~/.ssh/id_rsa.pub")

  tags = {
    Name        = "glyfs-key-${var.environment}"
    Environment = var.environment
  }
}

module "ec2" {
  source        = "./ec2"
  environment   = var.environment
  app_sg_id     = aws_security_group.app.id
  key_name      = aws_key_pair.app.key_name
  subnet_id     = aws_subnet.public_a.id
  instance_type = var.instance_type
}