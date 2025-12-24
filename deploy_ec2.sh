#!/bin/bash

# Solana Meme Coin Trading Bot - EC2 Deployment Script
# This script installs Docker, Docker Compose, and deploys the application.

set -e

echo "🚀 Starting deployment process..."

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Docker and Docker Compose
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

# 3. Setup Project Directory
PROJECT_DIR="/home/ubuntu/solana-meme-trading"
echo "Cc Creating project directory at $PROJECT_DIR..."
mkdir -p $PROJECT_DIR

# Note: In a real scenario, you would git clone here.
# For now, we assume files are transferred via SCP or Git.
# echo "📥 Cloning repository..."
# git clone https://github.com/yourusername/solana-meme-trading.git $PROJECT_DIR

# 4. Environment Setup
echo "⚙️ Setting up environment variables..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "⚠️ .env file not found! Creating example .env..."
    cat > $PROJECT_DIR/.env << EOL
# Backend Configuration
ENV=production
DEBUG=false
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://your-ec2-ip:3000

# Database
USE_POSTGRES=true
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=solana_trading
POSTGRES_HOST=db
POSTGRES_PORT=5432

# External APIs
BINANCE_API_URL=https://api.binance.com/api/v3
JUPITER_API_URL=https://quote-api.jup.ag/v6
COINGECKO_API_KEY=

# AI Configuration
GROQ_API_KEY=your_groq_api_key_here

# Alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
ALERT_SENDER_EMAIL=your_email@gmail.com
ALERT_RECIPIENT_EMAILS=admin@example.com
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Security
SECRET_KEY=change_this_to_a_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOL
    echo "✅ Created .env file. PLEASE EDIT IT WITH REAL CREDENTIALS!"
fi

# 5. Build and Deploy
echo "🏗️ Building and starting containers..."
cd $PROJECT_DIR

# Use production compose file if available, else default
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

sudo docker compose -f $COMPOSE_FILE up -d --build

echo "✅ Deployment complete!"
echo "🌍 Backend running on port 8000"
echo "🌍 Frontend running on port 3000"
echo "⚠️  Don't forget to configure Security Groups in AWS to allow ports 8000 and 3000 (and 22 for SSH)."
