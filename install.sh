#!/bin/bash

# 🦅 Mission Control One-Click Installer
# Usage: curl -sSL https://raw.githubusercontent.com/openclaw/mission-control/main/install.sh | bash

set -e

REPO_URL="https://github.com/msuhels/mission-control.git"
DEST_DIR="mission-control"

echo "🦅 Starting Mission Control Installation..."

# --- 🔍 Dependency Checks ---
echo "⚙️ Checking for required tools..."

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect Package Manager
if command_exists apt-get; then
    PKG_UPDATE="sudo apt-get update"
    PKG_INSTALL="sudo apt-get install -y"
elif command_exists dnf; then
    PKG_UPDATE="sudo dnf check-update"
    PKG_INSTALL="sudo dnf install -y"
fi

# 1. Ensure curl is present
if ! command_exists curl; then
    echo "📥 curl not found. Installing..."
    $PKG_UPDATE && $PKG_INSTALL curl
fi

# 2. Git
if ! command_exists git; then
    echo "📥 Git not found. Installing..."
    $PKG_INSTALL git
else
    echo "✅ Git is already installed."
fi

# 3. Docker
if ! command_exists docker; then
    echo "🐳 Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker is already installed."
fi

# 4. Node.js
if ! command_exists node; then
    echo "🟢 Node.js not found. Installing Node.js (v20)..."
    if command_exists apt-get; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command_exists dnf; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    fi
    echo "✅ Node.js installed."
else
    echo "✅ Node.js is already installed ($(node -v))."
fi

# 5. OpenSSL
if ! command_exists openssl; then
    echo "🔐 OpenSSL not found. Installing..."
    $PKG_INSTALL openssl
else
    echo "✅ OpenSSL is already installed."
fi

# --- 🚀 Installation Steps ---

# 1. Clone the repository
if [ ! -d "$DEST_DIR" ]; then
    echo "📂 Cloning Mission Control repository..."
    git clone "$REPO_URL" "$DEST_DIR"
fi

cd "$DEST_DIR"

# 2. Extract Gateway Token from OpenClaw config
echo "🔑 Extracting Gateway Token from ~/.openclaw/openclaw.json..."
if [ -f "$HOME/.openclaw/openclaw.json" ]; then
    TOKEN=$(grep -oP '"token":\s*"\K[^"]+' "$HOME/.openclaw/openclaw.json" | head -n 1)
    if [ -n "$TOKEN" ]; then
        echo "✅ Found token."
    else
        echo "⚠️ Warning: Token not found in openclaw.json."
    fi
else
    echo "⚠️ Warning: ~/.openclaw/openclaw.json not found."
fi

# 2b. Ensure gateway bind is set to "lan" (Docker can't reach "loopback")
echo "🌐 Checking gateway bind setting..."
if [ -f "$HOME/.openclaw/openclaw.json" ]; then
    CURRENT_BIND=$(grep -oP '"bind":\s*"\K[^"]+' "$HOME/.openclaw/openclaw.json" | head -n 1)
    if [ "$CURRENT_BIND" = "loopback" ]; then
        echo "🔄 Updating gateway bind from 'loopback' to 'lan' for Docker connectivity..."
        sed -i 's/"bind":\s*"loopback"/"bind": "lan"/' "$HOME/.openclaw/openclaw.json"
        echo "🔄 Restarting OpenClaw gateway to apply bind change..."
        openclaw gateway restart 2>/dev/null || echo "⚠️ Could not restart gateway. Please run: openclaw gateway restart"
        echo "✅ Gateway bind updated to 'lan'."
    elif [ "$CURRENT_BIND" = "lan" ]; then
        echo "✅ Gateway bind already set to 'lan'."
    else
        echo "ℹ️ Gateway bind is set to '$CURRENT_BIND' (not modifying)."
    fi
fi

# 3. Prompt for configuration (with defaults)
echo ""
echo "📝 Configuration Setup:"
read -p "📧 Enter Admin Email (default: admin@gmail.com): " USER_ADMIN_EMAIL </dev/tty
ADMIN_EMAIL=${USER_ADMIN_EMAIL:-admin@gmail.com}

read -p "🔐 Enter Admin Password (default: admin123): " USER_ADMIN_PASSWORD </dev/tty
ADMIN_PASSWORD=${USER_ADMIN_PASSWORD:-admin123}

read -p "🤖 Enter Default Model (default: google-gemini-cli/gemini-3-flash-preview): " USER_DEFAULT_MODEL </dev/tty
DEFAULT_MODEL=${USER_DEFAULT_MODEL:-google-gemini-cli/gemini-3-flash-preview}
echo ""

# 4. Setup .env.local
if [ ! -f ".env.local" ]; then
    echo "📄 Generating .env.local..."
    cat > .env.local <<EOF
# Postgres + PostgREST (Docker Compose)
POSTGRES_DB=mission_control
POSTGRES_USER=mc_admin
POSTGRES_PASSWORD=$(openssl rand -hex 12)
POSTGRES_PORT=5433
POSTGREST_PORT=3001
POSTGREST_URL=http://localhost:3001
POSTGREST_JWT_SECRET=$(openssl rand -base64 32)

# Frontend (Next.js)
FRONTEND_PORT=3000
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
GATEWAY_URL=http://host.docker.internal:18789
GATEWAY_TOKEN=$TOKEN
DEFAULT_MODEL=$DEFAULT_MODEL
EOF
else
    echo "ℹ️ .env.local already exists. Updating configuration..."
    
    # helper function to update or append env var
    update_env_var() {
        local var_name=$1
        local var_value=$2
        if grep -q "^${var_name}=" .env.local; then
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env.local
        else
            echo "${var_name}=${var_value}" >> .env.local
        fi
    }

    update_env_var "ADMIN_EMAIL" "$ADMIN_EMAIL"
    update_env_var "ADMIN_PASSWORD" "$ADMIN_PASSWORD"
    update_env_var "DEFAULT_MODEL" "$DEFAULT_MODEL"
    
    if [ -n "$TOKEN" ]; then
        update_env_var "GATEWAY_TOKEN" "$TOKEN"
    fi
fi

# 4. Spin up the platform
echo "🐳 Starting Docker containers..."
docker compose -f docker-compose.prod.yml --env-file .env.local up -d --build

echo ""
echo "✨ Mission Control successfully installed and started!"
echo "📍 URL: http://localhost:3000"
echo "📍 API: http://localhost:3001"
echo ""
echo "To manage your agents, run: cd $DEST_DIR && ./run.sh"
