#!/bin/bash
# Local development startup script for Treasury Plane
# Repository: https://github.com/US-Department-of-the-Treasury/plane-treasury
#
# This script starts all services needed for local development with
# dynamic port allocation to support multiple worktrees running concurrently.
#
# Services:
# - Django API server (default: 8000)
# - Web app (default: 3000)
# - Admin panel (default: 3001)
# - Space app (default: 3002)
# - Live server (default: 3100)
#
# Port ranges are automatically allocated to avoid conflicts.
# Use PORT_OFFSET=N to manually select a port range (0-9).
#
# Prerequisites:
# - Node.js 20+
# - Python 3.12+
# - PostgreSQL 14+ (running)
# - Redis 6.2+ (running)
# - pnpm installed
#
# Options:
#   --list    Show all running dev servers across worktrees and exit
#   --help    Show this help message

set -e

# Handle command line arguments
case "${1:-}" in
    --list)
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        source "$SCRIPT_DIR/port-manager.sh"
        list_all_dev_servers
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --list    Show all running dev servers across worktrees and exit"
        echo "  --help    Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  PORT_OFFSET=N   Manually select port range 0-9 (default: auto-detect)"
        exit 0
        ;;
esac

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

# Source the port manager
source "$SCRIPT_DIR/port-manager.sh"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}x $1 not found${NC}"
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
    echo -e "${RED}x PostgreSQL is not running${NC}"
    echo -e "${YELLOW}  Start with: brew services start postgresql@14${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if Redis is running
if ! redis-cli ping &>/dev/null; then
    echo -e "${RED}x Redis is not running${NC}"
    echo -e "${YELLOW}  Start with: brew services start redis${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Redis is running${NC}"

echo ""

# Show any running dev servers from other worktrees
RUNNING_COUNT=$(find "$(dirname "$PROJECT_ROOT")" -maxdepth 3 -name ".dev-ports" 2>/dev/null | wc -l | tr -d ' ')
if [ "$RUNNING_COUNT" -gt 0 ]; then
    echo -e "${BLUE}Found $RUNNING_COUNT other worktree(s) with dev-ports files:${NC}"
    for ports_file in "$(dirname "$PROJECT_ROOT")"/*/.dev-ports "$(dirname "$PROJECT_ROOT")"/*/*/.dev-ports 2>/dev/null; do
        if [ -f "$ports_file" ] && [ "$ports_file" != "$DEV_PORTS_FILE" ]; then
            wt_name=$(grep "^WORKTREE_NAME=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_web=$(grep "^WEB_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            if [ -n "$wt_web" ] && lsof -i :"$wt_web" > /dev/null 2>&1; then
                echo -e "  ${GREEN}●${NC} ${wt_name:-unknown} - http://localhost:$wt_web (running)"
            else
                echo -e "  ${YELLOW}○${NC} ${wt_name:-unknown} - http://localhost:$wt_web (stale .dev-ports)"
            fi
        fi
    done
    echo ""
fi

# Get available ports (checks for existing .dev-ports or finds new range)
echo -e "${YELLOW}Allocating ports...${NC}"

# Allow manual override via PORT_OFFSET env var
if [ -n "$PORT_OFFSET" ]; then
    echo -e "${BLUE}Using manual port offset: $PORT_OFFSET${NC}"
    calculate_ports "$PORT_OFFSET"
else
    if ! get_available_ports; then
        exit 1
    fi
fi

export_port_env
print_ports

echo -e "${YELLOW}Building packages...${NC}"
cd "$PROJECT_ROOT"

# Check if packages are actually built (not just cached)
BUILD_FLAGS="--no-daemon"
if [ ! -f "$PROJECT_ROOT/packages/utils/dist/index.js" ]; then
    echo -e "${YELLOW}  Fresh checkout detected, forcing rebuild...${NC}"
    BUILD_FLAGS="--force --no-daemon"
fi

# Build internal packages first (ensures @plane/* packages are ready)
pnpm turbo run build --filter="@plane/*" $BUILD_FLAGS

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
    echo -e "${RED}x apps/api/.env not found${NC}"
    echo -e "${YELLOW}  Copy from example: cp apps/api/.env.example apps/api/.env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API .env exists${NC}"

echo ""
echo -e "${YELLOW}Starting services...${NC}"

# Track PIDs for cleanup
declare -a PIDS=()

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    # Kill tracked processes
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done

    # Clean up any stragglers
    pkill -f "python manage.py runserver.*$API_PORT" 2>/dev/null || true
    pkill -f "react-router dev.*--port $WEB_PORT" 2>/dev/null || true
    pkill -f "react-router dev.*--port $ADMIN_PORT" 2>/dev/null || true
    pkill -f "react-router dev.*--port $SPACE_PORT" 2>/dev/null || true

    # Remove the ports file
    cleanup_ports

    echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# Save ports for other scripts (e.g., test-e2e.sh) to use
save_ports

# Start API server in background
echo -e "${BLUE}Starting Django API server on port $API_PORT...${NC}"
cd "$API_DIR"
source venv/bin/activate
set -a && source .env && set +a

# Override CORS to allow dynamic frontend ports
export CORS_ALLOWED_ORIGINS="http://localhost:$WEB_PORT,http://localhost:$ADMIN_PORT,http://localhost:$SPACE_PORT,http://localhost:$LIVE_PORT,http://127.0.0.1:$WEB_PORT,http://127.0.0.1:$ADMIN_PORT,http://127.0.0.1:$SPACE_PORT,http://127.0.0.1:$LIVE_PORT,http://localhost:$API_PORT,http://127.0.0.1:$API_PORT"

# Override APP_BASE_URL so login redirects to the correct port
export APP_BASE_URL="http://localhost:$WEB_PORT"

python manage.py runserver "$API_PORT" &
PIDS+=($!)

# Wait for API to be ready
echo -n "Waiting for API..."
for i in {1..30}; do
    if curl -s "http://localhost:$API_PORT/" > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}failed${NC}"
        echo -e "${RED}API server failed to start on port $API_PORT${NC}"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Start frontend services individually with custom ports
echo -e "${BLUE}Starting frontend services...${NC}"
cd "$PROJECT_ROOT"

# Export VITE_* env vars with dynamic ports for all frontend apps
export VITE_API_BASE_URL="http://localhost:$API_PORT"
export VITE_WEB_BASE_URL="http://localhost:$WEB_PORT"
export VITE_ADMIN_BASE_URL="http://localhost:$ADMIN_PORT"
export VITE_SPACE_BASE_URL="http://localhost:$SPACE_PORT"
export VITE_LIVE_BASE_URL="http://localhost:$LIVE_PORT"

# Web app
echo -e "  Starting web app on port $WEB_PORT..."
pnpm --filter web exec react-router dev --port "$WEB_PORT" > /tmp/plane-web.log 2>&1 &
PIDS+=($!)

# Admin panel
echo -e "  Starting admin panel on port $ADMIN_PORT..."
pnpm --filter admin exec react-router dev --port "$ADMIN_PORT" > /tmp/plane-admin.log 2>&1 &
PIDS+=($!)

# Space app
echo -e "  Starting space app on port $SPACE_PORT..."
pnpm --filter space exec react-router dev --port "$SPACE_PORT" > /tmp/plane-space.log 2>&1 &
PIDS+=($!)

# Live server (uses different start mechanism)
echo -e "  Starting live server on port $LIVE_PORT..."
cd "$PROJECT_ROOT/apps/live"
if [ -f ".env" ]; then
    PORT=$LIVE_PORT pnpm dev > /tmp/plane-live.log 2>&1 &
    PIDS+=($!)
fi
cd "$PROJECT_ROOT"

# Wait for web app to be ready
echo -n "Waiting for web app..."
for i in {1..90}; do
    if curl -s "http://localhost:$WEB_PORT/" > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    if [ $i -eq 90 ]; then
        echo -e " ${YELLOW}timeout (may still be starting)${NC}"
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   All services are running!            ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "  ${BLUE}Web App:${NC}     http://localhost:$WEB_PORT"
echo -e "  ${BLUE}Admin:${NC}       http://localhost:$ADMIN_PORT/god-mode/"
echo -e "  ${BLUE}Space:${NC}       http://localhost:$SPACE_PORT"
echo -e "  ${BLUE}Live:${NC}        http://localhost:$LIVE_PORT"
echo -e "  ${BLUE}API:${NC}         http://localhost:$API_PORT"
echo ""
if [ "$PORT_OFFSET" != "0" ]; then
    echo -e "  ${YELLOW}Note: Using port offset $PORT_OFFSET (non-default ports)${NC}"
    echo ""
fi
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait
