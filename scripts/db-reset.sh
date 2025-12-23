#!/bin/bash
# Reset the database - flush and re-seed
#
# WARNING: This will delete ALL data in the database!
#
# Usage:
#   ./scripts/db-reset.sh              # Reset and seed with demo data
#   ./scripts/db-reset.sh --mode=random --issues=100
#   ./scripts/db-reset.sh --skip-seed  # Only flush, don't seed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Check if venv exists
if [ ! -d "$API_DIR/venv" ]; then
    echo -e "${RED}Error: Python venv not found at $API_DIR/venv${NC}"
    echo -e "${YELLOW}Run ./scripts/dev.sh first to set up the environment${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f "$API_DIR/.env" ]; then
    echo -e "${RED}Error: .env not found at $API_DIR/.env${NC}"
    echo -e "${YELLOW}Copy from example: cp $API_DIR/.env.example $API_DIR/.env${NC}"
    exit 1
fi

echo ""
echo -e "${RED}${BOLD}WARNING: This will delete ALL data in the database!${NC}"
echo ""
read -p "Are you sure? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Resetting database...${NC}"

cd "$API_DIR"
source venv/bin/activate
set -a && source .env && set +a

# Pass --confirm and all other arguments to the management command
python manage.py db_reset --confirm "$@"

echo ""
echo -e "${GREEN}Database reset complete!${NC}"
