# Worktree Dev Server Skill

Ensures dev servers run from the correct worktree directory, not the main repo.

## When to Use

Run this skill when:

- Starting development in a git worktree
- Dev server shows wrong code, build errors, or old UI
- Playwright tests fail with unexpected page content
- Screenshots show stale or incorrect UI state

## The Problem

When `pnpm dev:all` is started via background process or automation, it may inherit the working directory of the parent process (main repo) instead of the worktree. This causes:

- Code changes in worktree not reflected
- Build errors from mismatched dependencies
- Tests failing with wrong UI state

## Execution

```bash
# 1. Verify current directory is a worktree
WORKTREE_PATH=$(pwd)
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)

if [[ "$GIT_DIR" == *".git/worktrees/"* ]]; then
  echo "✓ In worktree: $WORKTREE_PATH"
else
  echo "⚠ Not in a worktree - verify you're in the correct directory"
fi

# 2. Check for running dev servers
echo ""
echo "Checking for existing dev servers..."
ps aux | grep -E "pnpm dev|react-router dev" | grep -v grep || echo "No dev servers running"

# 3. Kill stale servers if needed
echo ""
echo "To kill existing servers:"
echo "  pkill -f 'pnpm dev:all'"
echo "  pkill -f 'react-router dev'"

# 4. Start from correct directory
echo ""
echo "To start dev server from worktree:"
echo "  cd $WORKTREE_PATH && pnpm dev:all"

# 5. Check port allocation
if [ -f ".dev-ports" ]; then
  echo ""
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

| Symptom                  | Cause                         | Fix                                 |
| ------------------------ | ----------------------------- | ----------------------------------- |
| Wrong UI in screenshots  | Server running from main repo | Kill servers, restart from worktree |
| Port 3000 not responding | Worktree uses offset ports    | Check `.dev-ports` file             |
| Build errors not in code | Stale node_modules            | `pnpm install` in worktree          |

## Related

- `.dev-ports` - Port allocation per worktree
- `scripts/port-manager.sh` - Port allocation script
- `docs/solutions/dev-environment/worktree-dev-server-and-seeding-issues.md`
