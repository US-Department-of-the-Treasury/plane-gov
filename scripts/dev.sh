#!/bin/bash
# Local development startup script for Treasury Plane
# Repository: https://github.com/US-Department-of-the-Treasury/plane-treasury
#
# This script starts all services needed for local development:
# - Django API server (port 8000)
# - Web app (port 3000)
# - Admin panel (port 3001)
# - Space app (port 3002)
# - Live server (port 3100)
#
# Prerequisites:
# - Node.js 20+
# - Python 3.12+
# - PostgreSQL 14+ (running)
# - Redis 6.2+ (running)
# - pnpm installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Treasury Plane - Development Setup   ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}✗ $1 not found${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
    return 0
}

MISSING=0
check_command node || MISSING=1
check_command pnpm || MISSING=1
check_command python3.12 || check_command python3 || MISSING=1
check_command psql || MISSING=1
check_command redis-cli || MISSING=1

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}Missing prerequisites. Please install them first.${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo -e "${YELLOW}  Start with: brew services start postgresql@14${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if Redis is running
if ! redis-cli ping &>/dev/null; then
    echo -e "${RED}✗ Redis is not running${NC}"
    echo -e "${YELLOW}  Start with: brew services start redis${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Redis is running${NC}"

echo ""
echo -e "${YELLOW}Building packages...${NC}"
cd "$PROJECT_ROOT"

# Build internal packages first (ensures @plane/* packages are ready)
pnpm turbo run build --filter="@plane/*" --no-daemon

echo ""
echo -e "${YELLOW}Setting up Python environment...${NC}"

# Check if venv exists, create if not
if [ ! -d "$API_DIR/venv" ]; then
    echo "Creating Python virtual environment..."
    cd "$API_DIR"
    python3.12 -m venv venv || python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements/local.txt 2>/dev/null || pip install -r requirements.txt
else
    echo -e "${GREEN}✓ Python venv exists${NC}"
fi

# Check if .env exists
if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${RED}✗ apps/api/.env not found${NC}"
    echo -e "${YELLOW}  Copy from example: cp apps/api/.env.example apps/api/.env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API .env exists${NC}"

echo ""
echo -e "${YELLOW}Starting services...${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    pkill -f "python manage.py runserver" 2>/dev/null || true
    pkill -f "turbo run dev" 2>/dev/null || true
    pkill -f "react-router dev" 2>/dev/null || true
    echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT

# Start API server in background
echo -e "${BLUE}Starting Django API server...${NC}"
cd "$API_DIR"
source venv/bin/activate
set -a && source .env && set +a
python manage.py runserver 8000 &
API_PID=$!

# Wait for API to be ready
echo -n "Waiting for API..."
for i in {1..30}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Start frontend services
echo -e "${BLUE}Starting frontend services...${NC}"
cd "$PROJECT_ROOT"
pnpm dev &
FRONTEND_PID=$!

# Wait for services to start
echo ""
echo -n "Waiting for frontend services..."
for i in {1..60}; do
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   All services are running!            ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "  ${BLUE}Web App:${NC}     http://localhost:3000"
echo -e "  ${BLUE}Admin:${NC}       http://localhost:3001/god-mode/"
echo -e "  ${BLUE}Space:${NC}       http://localhost:3002"
echo -e "  ${BLUE}Live:${NC}        http://localhost:3100"
echo -e "  ${BLUE}API:${NC}         http://localhost:8000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait
