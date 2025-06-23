#!/bin/bash
# Installation script for alternative package managers

echo "🚀 GCP Outage Dashboard - Alternative Installation Methods"
echo "=========================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install with Yarn
install_with_yarn() {
    echo "📦 Installing with Yarn..."
    if ! command_exists yarn; then
        echo "Installing Yarn..."
        npm install -g yarn
    fi
    yarn install
    echo "✅ Yarn installation complete!"
    echo "Run: yarn dev"
}

# Function to install with pnpm
install_with_pnpm() {
    echo "⚡ Installing with pnpm..."
    if ! command_exists pnpm; then
        echo "Installing pnpm..."
        curl -fsSL https://get.pnpm.io/install.sh | sh -
        source ~/.bashrc
    fi
    pnpm install
    echo "✅ pnpm installation complete!"
    echo "Run: pnpm dev"
}

# Function to install with Bun
install_with_bun() {
    echo "🔥 Installing with Bun..."
    if ! command_exists bun; then
        echo "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        source ~/.bashrc
    fi
    bun install
    echo "✅ Bun installation complete!"
    echo "Run: bun dev"
}

# Function to setup Docker
setup_docker() {
    echo "🐳 Setting up Docker..."
    if ! command_exists docker; then
        echo "❌ Docker not found. Please install Docker Desktop first."
        echo "Visit: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    echo "Building Docker image..."
    docker-compose up --build -d
    echo "✅ Docker setup complete!"
    echo "Access at: http://localhost:3000"
}

# Main menu
echo "Choose your preferred installation method:"
echo "1) Yarn"
echo "2) pnpm" 
echo "3) Bun"
echo "4) Docker (Recommended - No local Node.js required)"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        install_with_yarn
        ;;
    2)
        install_with_pnpm
        ;;
    3)
        install_with_bun
        ;;
    4)
        setup_docker
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Installation complete! Choose your next step:"
echo "📖 Read README.md for detailed instructions"
echo "🔧 Configure environment variables in .env.local"
echo "🚀 Start the development server"
