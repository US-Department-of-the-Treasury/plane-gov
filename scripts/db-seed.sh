#!/bin/bash
# Seed the database with test data
#
# Usage:
#   ./scripts/db-seed.sh              # Seed with demo data
#   ./scripts/db-seed.sh --mode=random --issues=100
#   ./scripts/db-seed.sh --force      # Overwrite existing workspace

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

echo -e "${GREEN}Seeding database...${NC}"

cd "$API_DIR"
source venv/bin/activate
set -a && source .env && set +a

# Pass all arguments to the management command
python manage.py seed_data "$@"

echo ""
echo -e "${GREEN}Done! You can now log in with the seeded user.${NC}"
