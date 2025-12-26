# Worktree Dev Server Skill

Ensures dev servers run from the correct worktree directory with isolated ports.

## Critical Rule: NEVER Kill Another Worktree's Servers

**NEVER kill dev servers from another worktree to free up ports.**

If ports are in use, the `dev.sh` script should automatically find the next available port range. If it fails to do so, the problem is with the port allocation logic - fix that instead of killing other servers.

**Wrong approach:**

```bash
# DON'T DO THIS - kills another worktree's server
kill 52036  # Python process on port 8000
```

**Correct approach:**

```bash
# Let the script find an available port range automatically
pnpm dev  # Should allocate 3010/8010 if 3000/8000 are in use
```

If `pnpm dev` fails because all ports are in use but the script doesn't find an available range, investigate the port-manager.sh logic - don't kill other servers.

## How It Works

`pnpm dev` runs `./scripts/dev.sh` which:

1. **Scans for available port ranges** (offsets 0-9)
2. **Skips ranges that are in use** by other worktrees
3. **Allocates the first free range** for this worktree
4. **Writes `.dev-ports` file** with port allocation

| Worktree Offset | Web Port | API Port |
| --------------- | -------- | -------- |
| 0 (main)        | 3000     | 8000     |
| 1               | 3010     | 8010     |
| 2               | 3020     | 8020     |
| ...             | ...      | ...      |

## When to Use This Skill

Run this skill when:

- Dev server shows wrong code, build errors, or old UI
- Playwright tests fail with unexpected page content
- Screenshots show stale or incorrect UI state
- Need to verify which worktree a dev server is running from
- Port allocation fails unexpectedly

## Troubleshooting Port Allocation

If `pnpm dev` fails with "No available port ranges":

```bash
# 1. Check what's actually running
./scripts/dev.sh --list

# 2. Check for zombie servers (stale .dev-ports with no running process)
./scripts/dev.sh --cleanup

# 3. Verify port-manager logic
lsof -i :3000-3090 -i :8000-8090 | grep LISTEN
```

**Do NOT manually kill processes** unless they are truly orphaned (no .dev-ports file).

## Execution

```bash
# 1. Verify current directory
WORKTREE_PATH=$(pwd)
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)

if [[ "$GIT_DIR" == *".git/worktrees/"* ]]; then
  echo "✓ In worktree: $WORKTREE_PATH"
else
  echo "⚠ Not in a worktree - verify you're in the correct directory"
fi

# 2. Check running dev servers across all worktrees
./scripts/dev.sh --list

# 3. Start dev server (will auto-allocate ports)
pnpm dev

# 4. Check port allocation for THIS worktree
if [ -f ".dev-ports" ]; then
  echo "Port allocation for this worktree:"
  cat .dev-ports | grep -E "^(WEB_PORT|API_PORT|E2E_BASE_URL)="
fi
```

## Verification

After starting the dev server:

```bash
# Check correct port is responding
source .dev-ports 2>/dev/null || WEB_PORT=3000
curl -s "http://localhost:$WEB_PORT" | head -5

# Should show HTML from worktree's code
```

## Common Issues

| Symptom                    | Cause                                           | Fix                                  |
| -------------------------- | ----------------------------------------------- | ------------------------------------ |
| "No available port ranges" | All 10 offsets in use OR stale .dev-ports files | Run `./scripts/dev.sh --cleanup`     |
| Wrong UI in screenshots    | Connected to wrong worktree's server            | Check `.dev-ports` for correct ports |
| Port 3000 not responding   | This worktree uses offset ports                 | Check `.dev-ports` file              |

## Related

- `.dev-ports` - Port allocation per worktree
- `scripts/port-manager.sh` - Port allocation script
- `scripts/dev.sh --list` - Show all running dev servers
- `scripts/dev.sh --cleanup` - Clean up zombie servers
