#!/bin/bash

# Mission Control Setup & Run Script
# This script prepares the environment and starts the Docker containers.

set -e

echo "🦅 Setting up Mission Control..."

# 1. Extract Gateway Token from OpenClaw config
echo "🔑 Extracting Gateway Token from ~/.openclaw/openclaw.json..."
if [ -f "$HOME/.openclaw/openclaw.json" ]; then
    TOKEN=$(grep -oP '"token":\s*"\K[^"]+' "$HOME/.openclaw/openclaw.json" | head -n 1)
    if [ -n "$TOKEN" ]; then
        echo "✅ Found token: ${TOKEN:0:5}****************"
    else
        echo "⚠️ Warning: Token not found in openclaw.json. Will use existing GATEWAY_TOKEN if present."
    fi
else
    echo "⚠️ Warning: ~/.openclaw/openclaw.json not found."
fi

# 1b. Ensure gateway bind is set to "lan" (Docker can't reach "loopback")
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

# 2. Setup .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📄 Creating .env.local from defaults..."
    cat > .env.local <<EOF
# Postgres + PostgREST (Docker Compose)
POSTGRES_DB=mission_control
POSTGRES_USER=mc_admin
POSTGRES_PASSWORD=mc_dev_password
POSTGRES_PORT=5433
POSTGREST_PORT=3001
POSTGREST_URL=http://localhost:3001
POSTGREST_JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev-secret-key-$(date +%s)")

# Frontend (Next.js)
FRONTEND_PORT=3000
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin123
GATEWAY_URL=http://host.docker.internal:18789
GATEWAY_TOKEN=$TOKEN
DEFAULT_MODEL=google-gemini-cli/gemini-2.0-flash-exp
EOF
    echo "✅ Created .env.local"
elif [ -n "$TOKEN" ]; then
    echo "🔄 Updating GATEWAY_TOKEN in .env.local..."
    # Update the GATEWAY_TOKEN line if it exists
    if grep -q "GATEWAY_TOKEN=" .env.local; then
        sed -i "s|GATEWAY_TOKEN=.*|GATEWAY_TOKEN=$TOKEN|" .env.local
    else
        echo "GATEWAY_TOKEN=$TOKEN" >> .env.local
    fi
    echo "✅ Token updated."
fi

# 3. Choose environment (Dev vs Prod)
ENV_FILE="docker-compose.dev.yml"
if [[ "$1" == "--prod" ]]; then
    ENV_FILE="docker-compose.prod.yml"
    echo "🚀 Starting in PRODUCTION mode..."
else
    echo "🛠️ Starting in DEVELOPMENT mode..."
fi

# 4. Spin up containers
echo "🐳 Pulling and building containers..."
docker compose -f "$ENV_FILE" --env-file .env.local up -d --build

echo ""
echo "✨ Mission Control is coming online!"
echo "📍 Dashboard: http://localhost:3000"
echo "📍 API: http://localhost:3001"
echo ""
echo "To view logs, run: docker compose -f $ENV_FILE logs -f"
