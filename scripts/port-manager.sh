#!/bin/bash
# Port Manager for Treasury Plane
# Repository: https://github.com/US-Department-of-the-Treasury/plane-treasury
#
# This script manages dynamic port allocation for dev servers and tests.
# It enables running multiple worktrees concurrently without port conflicts.
#
# Usage:
#   source ./scripts/port-manager.sh
#
#   # Get available ports (scans for first free range)
#   get_available_ports
#
#   # Check if ports are already allocated for this worktree
#   load_ports_if_running
#
#   # Write current ports to .dev-ports file
#   save_ports
#
# Port ranges (offset 0-9, each gets 10 ports):
#   Offset 0: web=3000, admin=3001, space=3002, live=3100, api=8000
#   Offset 1: web=3010, admin=3011, space=3012, live=3110, api=8010
#   ...
#   Offset 9: web=3090, admin=3091, space=3092, live=3190, api=8090

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project root (works from any subdirectory)
get_project_root() {
    git rev-parse --show-toplevel 2>/dev/null || pwd
}

PROJECT_ROOT=$(get_project_root)
DEV_PORTS_FILE="$PROJECT_ROOT/.dev-ports"

# Default base ports
BASE_WEB_PORT=3000
BASE_ADMIN_PORT=3001
BASE_SPACE_PORT=3002
BASE_LIVE_PORT=3100
BASE_API_PORT=8000

# Current ports (set by get_available_ports or load_ports_if_running)
# Preserve PORT_OFFSET if already set by user (e.g., PORT_OFFSET=0 ./scripts/dev.sh)
WEB_PORT=""
ADMIN_PORT=""
SPACE_PORT=""
LIVE_PORT=""
API_PORT=""
PORT_OFFSET="${PORT_OFFSET:-}"

# Check if a port is in use
is_port_in_use() {
    local port=$1
    lsof -i :"$port" > /dev/null 2>&1
}

# Check if a port is in use by OUR dev server (check .dev-ports from other worktrees)
is_our_port() {
    local port=$1
    # Check if this port matches what's in our .dev-ports file
    if [ -f "$DEV_PORTS_FILE" ]; then
        grep -q "WEB_PORT=$port\|ADMIN_PORT=$port\|SPACE_PORT=$port\|LIVE_PORT=$port\|API_PORT=$port" "$DEV_PORTS_FILE" 2>/dev/null
        return $?
    fi
    return 1
}

# Calculate ports for a given offset
calculate_ports() {
    local offset=$1
    WEB_PORT=$((BASE_WEB_PORT + offset * 10))
    ADMIN_PORT=$((BASE_ADMIN_PORT + offset * 10))
    SPACE_PORT=$((BASE_SPACE_PORT + offset * 10))
    LIVE_PORT=$((BASE_LIVE_PORT + offset * 10))
    API_PORT=$((BASE_API_PORT + offset * 10))
    PORT_OFFSET=$offset
}

# Check if all ports in a range are available
is_range_available() {
    local offset=$1
    calculate_ports "$offset"

    # Check each port
    for port in $WEB_PORT $ADMIN_PORT $SPACE_PORT $LIVE_PORT $API_PORT; do
        if is_port_in_use "$port"; then
            return 1
        fi
    done
    return 0
}

# Find the first available port range
find_available_range() {
    for offset in 0 1 2 3 4 5 6 7 8 9; do
        if is_range_available "$offset"; then
            echo "$offset"
            return 0
        fi
    done
    echo "-1"
    return 1
}

# Clean up zombie/orphan dev servers that are no longer in use
# This kills processes on dev ports that don't have a valid .dev-ports file
cleanup_zombie_servers() {
    local cleaned=0
    local search_dir
    search_dir=$(dirname "$PROJECT_ROOT")

    echo -e "${YELLOW}Scanning for zombie dev servers...${NC}"

    # Step 1: Clean up stale .dev-ports files (where servers aren't actually running)
    shopt -s nullglob
    local all_ports_files=("$search_dir"/*/.dev-ports "$search_dir"/*/*/.dev-ports)
    shopt -u nullglob

    for ports_file in "${all_ports_files[@]}"; do
        if [ -f "$ports_file" ]; then
            local wt_web wt_api wt_path
            wt_web=$(grep "^WEB_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_api=$(grep "^API_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_path=$(grep "^WORKTREE_PATH=" "$ports_file" 2>/dev/null | cut -d= -f2)

            # Check if NEITHER the web nor API port is in use (server is dead)
            if [ -n "$wt_web" ] && ! is_port_in_use "$wt_web" && ! is_port_in_use "$wt_api"; then
                echo -e "  ${YELLOW}Removing stale .dev-ports:${NC} $ports_file"
                rm -f "$ports_file"
                cleaned=$((cleaned + 1))
            fi
        fi
    done

    # Step 2: Build a list of ports that ARE legitimately in use (have running .dev-ports)
    # Using a simple string instead of associative array for bash 3 compatibility
    local legitimate_ports=""

    # Re-glob after cleanup since some files may have been removed
    shopt -s nullglob
    all_ports_files=("$search_dir"/*/.dev-ports "$search_dir"/*/*/.dev-ports)
    shopt -u nullglob

    for ports_file in "${all_ports_files[@]}"; do
        if [ -f "$ports_file" ]; then
            local wt_web wt_api
            wt_web=$(grep "^WEB_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_api=$(grep "^API_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            if [ -n "$wt_web" ] && is_port_in_use "$wt_web"; then
                legitimate_ports="$legitimate_ports:$wt_web:"
                [ -n "$wt_api" ] && legitimate_ports="$legitimate_ports:$wt_api:"
            fi
        fi
    done

    # Step 3: Find orphan processes on dev ports (not in legitimate_ports list)
    local orphan_pids=""
    local port_info
    port_info=$(lsof -i :3000-3099 -i :8000-8099 -P -n 2>/dev/null | grep LISTEN | awk '{split($9,a,":"); print $2 ":" a[2]}' | sort -u)

    if [ -n "$port_info" ]; then
        while IFS=: read -r pid port; do
            # Check if port is NOT in legitimate_ports (using string search)
            if [ -n "$port" ] && [[ "$legitimate_ports" != *":$port:"* ]]; then
                # This is an orphan - port not associated with any valid .dev-ports file
                local cmd
                cmd=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                # Only kill node/python processes (our dev servers)
                case "$cmd" in
                    *node*|*python*|*Python*)
                        echo -e "  ${RED}Killing orphan:${NC} PID $pid ($cmd) on port $port"
                        kill "$pid" 2>/dev/null || true
                        cleaned=$((cleaned + 1))
                        orphan_pids="$orphan_pids $pid"
                        ;;
                esac
            fi
        done <<< "$port_info"
    fi

    # Wait a moment for processes to die
    if [ -n "$orphan_pids" ]; then
        sleep 1
        # Force kill any that didn't die gracefully
        for pid in $orphan_pids; do
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "  ${RED}Force killing:${NC} PID $pid"
                kill -9 "$pid" 2>/dev/null || true
            fi
        done
        sleep 1
    fi

    if [ $cleaned -eq 0 ]; then
        echo -e "  ${GREEN}No zombie servers found${NC}"
    else
        echo -e "  ${GREEN}Cleaned up $cleaned zombie server(s)${NC}"
    fi

    return 0
}

# Find available range, with automatic zombie cleanup if none found
find_available_range_with_cleanup() {
    # First try without cleanup
    local offset
    offset=$(find_available_range)

    if [ "$offset" != "-1" ]; then
        echo "$offset"
        return 0
    fi

    # No ports available, try cleaning up zombies
    echo -e "${YELLOW}No port ranges available, attempting cleanup...${NC}" >&2
    cleanup_zombie_servers >&2

    # Wait a bit longer for ports to be fully released
    sleep 2

    # Retry up to 3 times with increasing delays
    local retries=0
    while [ $retries -lt 3 ]; do
        offset=$(find_available_range)
        if [ "$offset" != "-1" ]; then
            echo "$offset"
            return 0
        fi
        retries=$((retries + 1))
        if [ $retries -lt 3 ]; then
            echo -e "${YELLOW}Ports not yet available, retrying in 2 seconds... (attempt $((retries + 1))/3)${NC}" >&2
            sleep 2
        fi
    done

    echo "-1"
    return 1
}

# Load ports from .dev-ports if servers are still running
load_ports_if_running() {
    if [ ! -f "$DEV_PORTS_FILE" ]; then
        return 1
    fi

    # Source the ports file
    source "$DEV_PORTS_FILE"

    # Check if the servers are actually running on these ports
    if is_port_in_use "$WEB_PORT" && is_port_in_use "$API_PORT"; then
        echo -e "${GREEN}Found running servers from this worktree${NC}"
        echo -e "  Web:   http://localhost:$WEB_PORT"
        echo -e "  API:   http://localhost:$API_PORT"
        return 0
    fi

    # Servers not running, clear the ports
    WEB_PORT=""
    ADMIN_PORT=""
    SPACE_PORT=""
    LIVE_PORT=""
    API_PORT=""
    PORT_OFFSET=""
    return 1
}

# Get available ports (either from existing .dev-ports or scan for new range)
# Automatically cleans up zombie servers if no ports are available
get_available_ports() {
    # First, check if we have running servers for this worktree
    if load_ports_if_running; then
        return 0
    fi

    # Find an available range (with automatic zombie cleanup if needed)
    local offset
    offset=$(find_available_range_with_cleanup)

    if [ "$offset" = "-1" ]; then
        echo -e "${RED}ERROR: No available port ranges found (checked offsets 0-9)${NC}"
        echo -e "${YELLOW}Even after cleanup, all port ranges are in use.${NC}"
        echo -e "${YELLOW}Run './scripts/dev.sh --list' to see running servers.${NC}"
        echo -e "${YELLOW}Or manually kill processes: lsof -i :3000-3100 | grep LISTEN${NC}"
        return 1
    fi

    calculate_ports "$offset"

    if [ "$offset" -eq 0 ]; then
        echo -e "${GREEN}Using default ports (range 0)${NC}"
    else
        echo -e "${YELLOW}Default ports in use, using port range $offset${NC}"
    fi

    return 0
}

# Save current ports to .dev-ports file
save_ports() {
    if [ -z "$WEB_PORT" ]; then
        echo -e "${RED}ERROR: Ports not set. Call get_available_ports first.${NC}"
        return 1
    fi

    local worktree_name
    worktree_name=$(basename "$PROJECT_ROOT")

    cat > "$DEV_PORTS_FILE" << EOF
# Auto-generated by port-manager.sh
# DO NOT EDIT - this file is managed automatically
# Delete this file to reset port allocation

WORKTREE_PATH=$PROJECT_ROOT
WORKTREE_NAME=$worktree_name
STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PORT_OFFSET=$PORT_OFFSET
WEB_PORT=$WEB_PORT
ADMIN_PORT=$ADMIN_PORT
SPACE_PORT=$SPACE_PORT
LIVE_PORT=$LIVE_PORT
API_PORT=$API_PORT

# For convenience in scripts
E2E_BASE_URL=http://localhost:$WEB_PORT
EOF

    echo -e "${GREEN}Saved ports to $DEV_PORTS_FILE${NC}"
}

# Print current port configuration
print_ports() {
    echo ""
    echo -e "${BLUE}Port Configuration:${NC}"
    echo -e "  Offset:  $PORT_OFFSET"
    echo -e "  Web:     http://localhost:$WEB_PORT"
    echo -e "  Admin:   http://localhost:$ADMIN_PORT"
    echo -e "  Space:   http://localhost:$SPACE_PORT"
    echo -e "  Live:    http://localhost:$LIVE_PORT"
    echo -e "  API:     http://localhost:$API_PORT"
    echo ""
}

# Clean up .dev-ports file (call on shutdown)
cleanup_ports() {
    if [ -f "$DEV_PORTS_FILE" ]; then
        rm -f "$DEV_PORTS_FILE"
        echo -e "${GREEN}Cleaned up $DEV_PORTS_FILE${NC}"
    fi
}

# Kill dev servers for THIS WORKTREE ONLY
# This is the SAFE way to stop dev servers - it only affects this worktree
kill_this_worktree() {
    if [ ! -f "$DEV_PORTS_FILE" ]; then
        echo -e "${YELLOW}No .dev-ports file found for this worktree${NC}"
        echo -e "${YELLOW}Dev servers may not be running, or were started without port-manager${NC}"
        return 1
    fi

    # Load ports from this worktree's .dev-ports file
    local wt_web wt_admin wt_space wt_live wt_api
    wt_web=$(grep "^WEB_PORT=" "$DEV_PORTS_FILE" 2>/dev/null | cut -d= -f2)
    wt_admin=$(grep "^ADMIN_PORT=" "$DEV_PORTS_FILE" 2>/dev/null | cut -d= -f2)
    wt_space=$(grep "^SPACE_PORT=" "$DEV_PORTS_FILE" 2>/dev/null | cut -d= -f2)
    wt_live=$(grep "^LIVE_PORT=" "$DEV_PORTS_FILE" 2>/dev/null | cut -d= -f2)
    wt_api=$(grep "^API_PORT=" "$DEV_PORTS_FILE" 2>/dev/null | cut -d= -f2)

    echo -e "${BLUE}Killing dev servers for this worktree only...${NC}"
    echo -e "  Worktree: $(basename "$PROJECT_ROOT")"
    echo -e "  Ports: web=$wt_web, admin=$wt_admin, space=$wt_space, live=$wt_live, api=$wt_api"

    local killed=0

    # Kill processes on each port
    for port in $wt_web $wt_admin $wt_space $wt_live $wt_api; do
        if [ -n "$port" ]; then
            local pids
            pids=$(lsof -t -i :"$port" 2>/dev/null)
            if [ -n "$pids" ]; then
                for pid in $pids; do
                    echo -e "  ${RED}Killing${NC} PID $pid on port $port"
                    kill "$pid" 2>/dev/null
                    killed=$((killed + 1))
                done
            fi
        fi
    done

    # Wait for processes to die
    if [ $killed -gt 0 ]; then
        sleep 1
        # Force kill any that didn't die gracefully
        for port in $wt_web $wt_admin $wt_space $wt_live $wt_api; do
            if [ -n "$port" ]; then
                local pids
                pids=$(lsof -t -i :"$port" 2>/dev/null)
                if [ -n "$pids" ]; then
                    for pid in $pids; do
                        echo -e "  ${RED}Force killing${NC} PID $pid on port $port"
                        kill -9 "$pid" 2>/dev/null
                    done
                fi
            fi
        done
    fi

    # Clean up .dev-ports file
    rm -f "$DEV_PORTS_FILE"

    if [ $killed -eq 0 ]; then
        echo -e "${YELLOW}No processes found on the allocated ports${NC}"
    else
        echo -e "${GREEN}Killed $killed process(es) for this worktree${NC}"
    fi

    return 0
}

# List all running dev servers across all worktrees
list_all_dev_servers() {
    echo -e "${BLUE}Scanning for running dev servers...${NC}"
    echo ""

    local found=0

    # Find all .dev-ports files in parent directory (where worktrees typically live)
    local search_dir
    search_dir=$(dirname "$PROJECT_ROOT")

    # Use nullglob to handle no matches gracefully
    shopt -s nullglob
    local all_ports_files=("$search_dir"/*/.dev-ports "$search_dir"/*/*/.dev-ports)
    shopt -u nullglob

    for ports_file in "${all_ports_files[@]}"; do
        if [ -f "$ports_file" ]; then
            # Source the file to get variables
            local wt_path wt_name wt_web wt_api wt_started
            wt_path=$(grep "^WORKTREE_PATH=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_name=$(grep "^WORKTREE_NAME=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_web=$(grep "^WEB_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_api=$(grep "^API_PORT=" "$ports_file" 2>/dev/null | cut -d= -f2)
            wt_started=$(grep "^STARTED_AT=" "$ports_file" 2>/dev/null | cut -d= -f2)

            # Check if servers are actually running
            if [ -n "$wt_web" ] && is_port_in_use "$wt_web"; then
                found=$((found + 1))
                echo -e "${GREEN}[$found] ${wt_name:-unknown}${NC}"
                echo -e "    Path:    ${wt_path:-unknown}"
                echo -e "    Web:     http://localhost:$wt_web"
                echo -e "    API:     http://localhost:${wt_api:-?}"
                echo -e "    Started: ${wt_started:-unknown}"
                echo ""
            fi
        fi
    done

    if [ $found -eq 0 ]; then
        echo -e "${YELLOW}No running dev servers found with .dev-ports files.${NC}"
        echo ""
        echo -e "Checking for orphan processes on common dev ports..."
        # Parse lsof output to get PID, command, and port
        local orphan_info
        orphan_info=$(lsof -i :3000-3090 -i :8000-8090 -P -n 2>/dev/null | grep LISTEN | awk '{split($9,a,":"); print $2 "|" $1 "|" a[2]}' | sort -u)
        if [ -n "$orphan_info" ]; then
            echo -e "${YELLOW}Found processes without .dev-ports:${NC}"
            while IFS='|' read -r pid cmd port; do
                local cwd
                cwd=$(lsof -p "$pid" 2>/dev/null | grep cwd | awk '{print $NF}')
                echo -e "  PID $pid ($cmd) on port $port"
                echo -e "    Working dir: $cwd"
            done <<< "$orphan_info"
        else
            echo -e "${GREEN}No orphan processes found on ports 3000-3090 or 8000-8090.${NC}"
        fi
    fi

    return 0
}

# Export environment variables for use by other scripts
export_port_env() {
    export WEB_PORT
    export ADMIN_PORT
    export SPACE_PORT
    export LIVE_PORT
    export API_PORT
    export PORT_OFFSET
    export E2E_BASE_URL="http://localhost:$WEB_PORT"
    # Export VITE_API_BASE_URL so frontend knows where to find the API
    export VITE_API_BASE_URL="http://localhost:$API_PORT"
}
