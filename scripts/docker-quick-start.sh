#!/bin/bash
# Quick Docker setup - No npm required

echo "🐳 GCP Outage Dashboard - Docker Quick Start"
echo "============================================"

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found!"
    echo "Please install Docker Desktop:"
    echo "- Windows/Mac: https://www.docker.com/products/docker-desktop"
    echo "- Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose not found!"
    echo "Please install Docker Compose or use Docker Desktop"
    exit 1
fi

echo "✅ Docker found!"

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cat > .env.local << EOF
# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo "✅ Created .env.local - Please update with your settings"
fi

# Build and start the application
echo "🚀 Building and starting the application..."
docker-compose up --build -d

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if the application is running
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Application is running!"
    echo "🌐 Open http://localhost:3000 in your browser"
else
    echo "⚠️  Application might still be starting..."
    echo "📋 Check logs with: docker-compose logs -f"
fi

echo ""
echo "🎛️  Useful Docker commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose stop             # Stop application"
echo "  docker-compose restart          # Restart application"
echo "  docker-compose down             # Stop and remove containers"
echo "  docker-compose up -d            # Start in background"
