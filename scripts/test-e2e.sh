#!/bin/bash
# E2E Test Runner for Treasury Plane
# Repository: https://github.com/US-Department-of-the-Treasury/plane-treasury
#
# This script handles the full E2E test lifecycle:
# 1. Verifies prerequisites (PostgreSQL, Redis)
# 2. Checks if dev servers are already running (reuses them if so)
# 3. If not running, starts all services with dynamic port allocation
# 4. Runs Playwright tests
# 5. Cleans up services on exit (only if we started them)
#
# Usage:
#   ./scripts/test-e2e.sh                    # Run all E2E tests
#   ./scripts/test-e2e.sh --headed           # Run tests in headed mode
#   ./scripts/test-e2e.sh --project=smoke    # Run only smoke tests
#   ./scripts/test-e2e.sh --ui               # Open Playwright UI mode
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
WEB_DIR="$PROJECT_ROOT/apps/web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track whether we started the servers (vs reusing existing)
STARTED_SERVERS=false

# Track PIDs for cleanup
declare -a PIDS=()

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Treasury Plane - E2E Test Runner     ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Source the port manager
source "$SCRIPT_DIR/port-manager.sh"

# Parse arguments - pass all to Playwright
PLAYWRIGHT_ARGS="$@"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"

    # Only kill servers if we started them
    if [ "$STARTED_SERVERS" = true ]; then
        echo -e "${YELLOW}Stopping servers we started...${NC}"

        # Kill tracked processes
        for pid in "${PIDS[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done

        # Clean up any stragglers using our ports
        pkill -f "python manage.py runserver.*$API_PORT" 2>/dev/null || true
        pkill -f "react-router dev.*--port $WEB_PORT" 2>/dev/null || true

        # Remove the ports file since we're shutting down
        cleanup_ports
    else
        echo -e "${GREEN}Leaving dev servers running (they were already running before tests)${NC}"
    fi

    echo -e "${GREEN}Cleanup complete.${NC}"
}
trap cleanup EXIT INT TERM

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

# Check if dev servers are already running for this worktree
echo -e "${YELLOW}Checking for running dev servers...${NC}"

if load_ports_if_running; then
    echo -e "${GREEN}Reusing existing dev servers from this worktree${NC}"
    STARTED_SERVERS=false
else
    echo -e "${YELLOW}No running servers found, will start new ones${NC}"
    STARTED_SERVERS=true

    # Get available ports
    if ! get_available_ports; then
        exit 1
    fi
fi

export_port_env
print_ports

# Only start servers if they're not already running
if [ "$STARTED_SERVERS" = true ]; then
    echo -e "${YELLOW}Building packages...${NC}"
    cd "$PROJECT_ROOT"

    # Check if packages are actually built
    BUILD_FLAGS="--no-daemon"
    if [ ! -f "$PROJECT_ROOT/packages/utils/dist/index.js" ]; then
        echo -e "${YELLOW}  Fresh checkout detected, forcing rebuild...${NC}"
        BUILD_FLAGS="--force --no-daemon"
    fi

    # Build internal packages first
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

    # Save ports for reference
    save_ports

    # Start API server in background
    echo -e "${BLUE}Starting Django API server on port $API_PORT...${NC}"
    cd "$API_DIR"
    source venv/bin/activate
    set -a && source .env && set +a
    python manage.py runserver "$API_PORT" > /tmp/plane-api.log 2>&1 &
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
            echo -e "${RED}API server failed to start. Check /tmp/plane-api.log for details${NC}"
            exit 1
        fi
        echo -n "."
        sleep 1
    done

    # Start frontend services
    echo -e "${BLUE}Starting frontend on port $WEB_PORT...${NC}"
    cd "$PROJECT_ROOT"
    pnpm --filter web exec react-router dev --port "$WEB_PORT" > /tmp/plane-frontend.log 2>&1 &
    PIDS+=($!)

    # Wait for frontend to be ready
    echo -n "Waiting for frontend..."
    for i in {1..90}; do
        if curl -s "http://localhost:$WEB_PORT/" > /dev/null 2>&1; then
            echo -e " ${GREEN}ready${NC}"
            break
        fi
        if [ $i -eq 90 ]; then
            echo -e " ${RED}failed${NC}"
            echo -e "${RED}Frontend failed to start. Check /tmp/plane-frontend.log for details${NC}"
            exit 1
        fi
        echo -n "."
        sleep 1
    done
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   Services ready for testing!          ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "  ${BLUE}Web App:${NC}     http://localhost:$WEB_PORT"
echo -e "  ${BLUE}API:${NC}         http://localhost:$API_PORT"
if [ "$STARTED_SERVERS" = true ]; then
    echo -e "  ${YELLOW}Mode:${NC}        Started new servers (will stop after tests)"
else
    echo -e "  ${GREEN}Mode:${NC}        Reusing existing dev servers"
fi
echo ""

# Run Playwright tests with the correct base URL
echo -e "${YELLOW}Running E2E tests...${NC}"
echo ""
cd "$WEB_DIR"

# Set base URL for Playwright
export E2E_BASE_URL="http://localhost:$WEB_PORT"

# Run tests with passed arguments
if [ -n "$PLAYWRIGHT_ARGS" ]; then
    npx playwright test $PLAYWRIGHT_ARGS
else
    npx playwright test --project=smoke --project=crud
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}   All tests passed!                    ${NC}"
    echo -e "${GREEN}=========================================${NC}"
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}   Some tests failed                    ${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}View HTML report: npx playwright show-report${NC}"
fi

exit $TEST_EXIT_CODE
