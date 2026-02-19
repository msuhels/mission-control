#!/bin/bash

# 🦅 Mission Control One-Click Installer
# Usage: curl -sSL https://raw.githubusercontent.com/openclaw/mission-control/main/install.sh | bash

set -e

REPO_URL="https://github.com/openclaw/mission-control.git"
DEST_DIR="mission-control"

echo "🦅 Starting Mission Control Installation..."

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

# 3. Setup .env.local
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
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin123
GATEWAY_URL=http://host.docker.internal:18789
GATEWAY_TOKEN=$TOKEN
DEFAULT_MODEL=google-gemini-cli/gemini-2.0-flash-exp
EOF
else
    echo "ℹ️ .env.local already exists. Updating GATEWAY_TOKEN..."
    if [ -n "$TOKEN" ]; then
        if grep -q "GATEWAY_TOKEN=" .env.local; then
            sed -i "s|GATEWAY_TOKEN=.*|GATEWAY_TOKEN=$TOKEN|" .env.local
        else
            echo "GATEWAY_TOKEN=$TOKEN" >> .env.local
        fi
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
