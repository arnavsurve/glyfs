#!/bin/bash

# Amazon Linux 2023 setup script for Glyfs deployment
set -e

# Update system
dnf update -y

# Install required packages
dnf install -y docker git curl aws-cli

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group for passwordless docker commands
usermod -a -G docker ec2-user

# Configure Docker daemon for better logging and security
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

systemctl restart docker

# Install CloudWatch agent
dnf install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "metrics": {
    "namespace": "Glyfs/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"},
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MEM_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/glyfs",
            "log_stream_name": "{instance_id}/messages"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Create deployment directory
mkdir -p /home/ec2-user/scripts
chown -R ec2-user:ec2-user /home/ec2-user/scripts

# Create basic environment template for ec2-user
cat > /home/ec2-user/.env.production.template <<'EOF'
# Production Environment Variables
DATABASE_URL=postgresql://glyfs:password@your-rds-endpoint:5432/glyfs?sslmode=require
JWT_SECRET=your-super-secure-jwt-secret-here-256-bits-minimum
ENCRYPTION_KEY=your-encryption-key-here-32-chars-min
ENV=production
PORT=8080

# OAuth Configuration (Optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URL=https://yourdomain.com/api/auth/oauth/github/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=https://yourdomain.com/api/auth/oauth/google/callback

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Server-side API Keys (for title generation etc)
OPENAI_API_KEY=
EOF

chown ec2-user:ec2-user /home/ec2-user/.env.production.template

# Create helpful aliases for ec2-user
cat > /home/ec2-user/.bashrc <<'EOF'
# User specific aliases and functions
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias logs='docker logs glyfs-app'
alias deploy='cd /home/ec2-user && ./deploy.sh'
alias status='docker ps --filter name=glyfs-app'

# Docker shortcuts
alias d='docker'
alias dc='docker-compose'
alias dp='docker ps'
alias di='docker images'

export EDITOR=nano
export PATH="$PATH:/usr/local/bin"

echo "Welcome to Glyfs Production Server!"
echo "Run 'status' to see running containers"
echo "Run 'logs' to see application logs"
EOF

chown ec2-user:ec2-user /home/ec2-user/.bashrc

# Configure AWS CLI region for ec2-user
sudo -u ec2-user aws configure set default.region us-west-1

# Log completion
echo "Amazon Linux 2023 setup completed with Glyfs deployment tools" >> /var/log/user-data.log
echo "Setup completed at $(date)" >> /var/log/user-data.log