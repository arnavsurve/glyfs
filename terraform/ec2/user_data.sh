#!/bin/bash

# Amazon Linux 2023 setup script for Glyfs deployment
set -e

# Update system
dnf update -y

# Install required packages
dnf install -y docker git aws-cli nginx

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

# Configure nginx and retrieve SSL certificates
mkdir -p /etc/nginx/ssl

# Retrieve SSL certificates from Parameter Store
echo "Retrieving SSL certificates from Parameter Store..."
aws ssm get-parameter --name "/glyfs/ssl/cert" --with-decryption --query 'Parameter.Value' --output text > /etc/nginx/ssl/glyfs.dev.crt || echo "SSL cert parameter not found - HTTPS will fail"
aws ssm get-parameter --name "/glyfs/ssl/key" --with-decryption --query 'Parameter.Value' --output text > /etc/nginx/ssl/glyfs.dev.key || echo "SSL key parameter not found - HTTPS will fail"
cat > /etc/nginx/conf.d/glyfs.conf <<'EOF'
server {
        listen 80;
        server_name glyfs.dev www.glyfs.dev;
        return 301 https://$server_name$request_uri;
}

server {
        listen 443 ssl http2;
        server_name glyfs.dev www.glyfs.dev;

        ssl_certificate /etc/nginx/ssl/glyfs.dev.crt;
        ssl_certificate_key /etc/nginx/ssl/glyfs.dev.key;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;


        location / {
                proxy_pass http://localhost:8080;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                proxy_set_header X-Forwarded-Host $host;
                proxy_set_header X-Forwarded-Port $server_port;
        }
}
EOF

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

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

# Create deployment directory and script
mkdir -p /home/ec2-user/scripts

# Create ECR deployment script that CI/CD expects
cat > /home/ec2-user/scripts/deploy-ecr.sh <<'EOF'
#!/bin/bash
set -e

echo "🚀 Starting ECR deployment..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Stop existing container if running
docker stop glyfs-app 2>/dev/null || true
docker rm glyfs-app 2>/dev/null || true

# Pull and run new image
IMAGE="$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
echo "Pulling image: $IMAGE"
docker pull $IMAGE

# Run new container
docker run -d \
  --name glyfs-app \
  -p 8080:8080 \
  --env-file /home/ec2-user/.env.production \
  --restart unless-stopped \
  $IMAGE

echo "✅ Deployment complete!"
EOF

chmod +x /home/ec2-user/scripts/deploy-ecr.sh
chown -R ec2-user:ec2-user /home/ec2-user/scripts

# Generate .env.production from Secrets Manager
echo "Generating .env.production from Secrets Manager..."
SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "glyfs/production/env" --query 'SecretString' --output text 2>/dev/null || echo "{}")

if [ "$SECRET_JSON" = "{}" ]; then
    echo "Warning: Secret glyfs/production/env not found - creating template file"
    cat > /home/ec2-user/.env.production.template <<'EOF'
# Production Environment Variables Template
# Store actual values in AWS Secrets Manager: glyfs/production/env
DATABASE_URL=postgresql://glyfs:password@your-rds-endpoint:5432/glyfs?sslmode=require
JWT_SECRET=your-super-secure-jwt-secret-here-256-bits-minimum
ENCRYPTION_KEY=your-encryption-key-here-32-chars-min
ENV=production
PORT=8080
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FRONTEND_URL=https://glyfs.dev
OPENAI_API_KEY=
EOF
    chown ec2-user:ec2-user /home/ec2-user/.env.production.template
else
    # Convert JSON secret from secrets manager to .env format
    echo "$SECRET_JSON" | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' > /home/ec2-user/.env.production
    chown ec2-user:ec2-user /home/ec2-user/.env.production
    echo "✅ Generated .env.production from Secrets Manager"
fi


# Configure AWS CLI region for ec2-user
sudo -u ec2-user aws configure set default.region us-west-1

# Log completion
echo "Amazon Linux 2023 setup completed with Glyfs deployment tools" >> /var/log/user-data.log
echo "Setup completed at $(date)" >> /var/log/user-data.log
