---
module: Frontend Build
date: 2025-12-22
problem_type: build_error
component: tooling
symptoms:
  - "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory"
  - "Build process crashes during Vite/React Router compilation"
  - "Build hangs indefinitely before running out of memory"
root_cause: config_error
resolution_type: environment_setup
severity: high
tags: [vite, react-router, memory, heap, node-options, build, turbo-cache]
---

# Troubleshooting: Vite/React Router Build Runs Out of Memory

## Problem

Frontend builds (web/admin apps) fail with heap out of memory errors during `pnpm build`. The build process either crashes with a FATAL ERROR or hangs indefinitely before eventually failing.

## Environment

- Module: Frontend Build (apps/web, apps/admin)
- React Version: 19.x
- React Router: 7.9.5
- Vite: 7.1.11
- Build Tool: Turbo (pnpm workspace)
- Date: 2025-12-22

## Symptoms

- Build crashes with: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`
- Build process hangs during "transforming modules" phase
- Memory usage spikes to system limits
- Turbo cache becomes corrupted after failed builds

## What Didn't Work

**Attempted Solution 1:** Increasing NODE_OPTIONS incrementally (8GB, 16GB)
- **Why it failed:** Corrupted Turbo cache was causing memory to be consumed before the actual build could complete. Even with more memory allocated, the cache corruption caused issues.

**Attempted Solution 2:** Running build directly without cleaning caches
- **Why it failed:** The `.turbo` cache and `node_modules/.cache` directories contained corrupted state from previous failed builds, causing the memory issue to persist.

## Solution

**Step 1: Clean all build caches**

```bash
# Clean Turbo cache, node_modules cache, and previous build outputs
rm -rf .turbo node_modules/.cache apps/*/build
```

**Step 2: If still failing, increase Node heap size**

```bash
# Run build with increased memory (16GB)
NODE_OPTIONS="--max-old-space-size=16384" pnpm --filter web run build
```

**Deploy script troubleshooting note** (in `scripts/deploy-frontend.sh`):

```bash
# Troubleshooting:
# - If the build runs out of memory, increase Node's heap size:
#   NODE_OPTIONS="--max-old-space-size=16384" ./deploy-frontend.sh web
```

## Why This Works

1. **ROOT CAUSE**: React Router 7.9.5 with file-based routing and Vite 7.1.11 requires significant memory during the build phase, especially when transforming thousands of modules. The default Node.js heap size (~4GB) is insufficient for large React 19 codebases.

2. **Cache corruption compounds the problem**: When a build fails mid-process, Turbo's cache can become corrupted. Subsequent builds try to use this corrupted cache, consuming memory before the actual build work begins.

3. **The solution addresses both issues**:
   - Cleaning caches removes corrupted state
   - Increasing heap size (when needed) gives Node enough memory for the transformation phase
   - Not hard-coding the memory limit allows faster machines to use their native configuration

## Prevention

- **Clean caches when switching branches** or after failed builds:
  ```bash
  rm -rf .turbo node_modules/.cache
  ```

- **Don't hard-code memory limits** in scripts - add as troubleshooting notes so developers on faster machines aren't unnecessarily restricted

- **Monitor build memory usage** during development to catch issues early

- **If builds consistently need more memory**, consider:
  - Splitting the build into smaller chunks
  - Reviewing if all dependencies are necessary
  - Checking for memory leaks in build plugins

## Related Issues

No related issues documented yet.
