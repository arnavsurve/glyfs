output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = module.ec2.public_ip
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = module.ec2.instance_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgres.port
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

output "nat_instance_ip" {
  description = "Public IP of NAT instance"
  value       = aws_eip.nat.public_ip
}


output "app_security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.db.id
}

output "ssh_connection_command" {
  description = "SSH connection command"
  value       = "ssh -i ~/.ssh/id_rsa ec2-user@${module.ec2.public_ip}"
}

output "cost_saving_commands" {
  description = "Commands to stop resources and save money"
  value = {
    stop_app  = "aws ec2 stop-instances --instance-ids ${module.ec2.instance_id}"
    stop_rds  = "aws rds stop-db-instance --db-instance-identifier ${aws_db_instance.postgres.id}"
    stop_nat  = "aws ec2 stop-instances --instance-ids ${aws_instance.nat.id}"
    start_app = "aws ec2 start-instances --instance-ids ${module.ec2.instance_id}"
    start_rds = "aws rds start-db-instance --db-instance-identifier ${aws_db_instance.postgres.id}"
    start_nat = "aws ec2 start-instances --instance-ids ${aws_instance.nat.id}"
  }
}
