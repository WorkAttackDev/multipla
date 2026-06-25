#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/izinet-api"
BRANCH="main"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- sanity checks ---
if [ ! -d "$APP_DIR" ]; then
  error "$APP_DIR does not exist. Run the initial deploy first."
  exit 1
fi

if ! command -v node &> /dev/null; then
  error "Node.js is not installed."
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 22 ]; then
  error "Node.js >= 22 required (found v$(node -v))."
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  error "pnpm is not installed."
  exit 1
fi

if ! command -v pm2 &> /dev/null; then
  error "PM2 is not installed."
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  error ".env file not found in $APP_DIR. Create it from .env.example first."
  exit 1
fi

# --- deploy ---
cd "$APP_DIR"

info "Pulling latest code ($BRANCH)"
git pull origin "$BRANCH"

info "Installing dependencies"
pnpm install --frozen-lockfile

info "Building TypeScript"
pnpm build

info "Running database migrations"
pnpm migrate:prod:up

info "Restarting PM2 processes"
pm2 startOrReload ecosystem.config.js --update-env

info "Deploy complete"
