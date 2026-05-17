#!/bin/bash

echo "🚀 Starting n8n VM Setup..."

# Step 1: Update package list and install prerequisites
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install ca-certificates curl nano -y

# Step 2: Install Docker
echo "🐳 Installing Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"\${UBUNTU_CODENAME:-\$VERSION_CODENAME}\") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Step 3: Setup Directories
echo "📁 Creating n8n directories..."
mkdir -p ~/n8n-compose/local-files
cd ~/n8n-compose

echo "✅ Setup Complete!"
echo "Next Steps:"
echo "1. Move your docker-compose.yml and .env files to ~/n8n-compose"
echo "2. Run: sudo docker compose up -d"
