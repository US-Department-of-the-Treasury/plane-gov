---
module: Frontend Routing
date: 2025-12-23
problem_type: runtime_error
component: routing
symptoms:
  - "Layout renders but child route content is empty"
  - "Page shows header/sidebar but main content area is blank"
  - "React Router nested routes not displaying"
root_cause: pattern_mismatch
resolution_type: code_fix
severity: medium
tags: [react-router, layout, outlet, children, nested-routes, routing]
---

# React Router Layout: Outlet vs Children Pattern

## Problem

When creating layouts for React Router routes, the page renders the layout components (header, sidebar) but the child route content is completely empty. The DOM shows an empty container where content should appear.

## Environment

- Module: Frontend Routing (apps/web)
- React Router: 7.x with file-based routing
- Framework: Vite + React 19
- Date: 2025-12-23

## Symptoms

- Layout component renders correctly (header, sidebar visible)
- Main content area is empty: `<div class="flex-1 overflow-y-auto"></div>`
- No console errors - the route matches, but content doesn't render
- Child page component exists and exports correctly
- Route is registered in `routes.ts`

## What Didn't Work

**Attempted Solution 1:** Checking if the child component exported correctly

- **Why it failed:** The component was fine; the issue was in how the layout rendered children.

**Attempted Solution 2:** Verifying route registration in `routes.ts`

- **Why it failed:** Routes were correctly registered; the issue was the layout pattern, not route config.

## Root Cause

**React Router uses `<Outlet />` to render child routes, not the `{children}` prop.**

This is a common mistake when developers are familiar with Next.js (which uses `{children}`) and apply the same pattern to React Router.

### Wrong (Next.js Pattern)

```tsx
// This does NOT work in React Router
interface LayoutProps {
  children: React.ReactNode;
}

export default function ResourcesLayout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <ResourcesHeader />
      <div className="flex-1 overflow-y-auto">
        {children} {/* <-- WRONG: children is undefined in React Router */}
      </div>
    </div>
  );
}
```

### Correct (React Router Pattern)

```tsx
import { Outlet } from "react-router";

export default function ResourcesLayout() {
  return (
    <div className="flex flex-col h-full">
      <ResourcesHeader />
      <div className="flex-1 overflow-y-auto">
        <Outlet /> {/* <-- CORRECT: Outlet renders the matched child route */}
      </div>
    </div>
  );
}
```

## Solution

**Step 1: Import Outlet from react-router**

```tsx
import { Outlet } from "react-router";
```

**Step 2: Replace `{children}` with `<Outlet />`**

Remove the `children` prop from the component signature and replace `{children}` in JSX with `<Outlet />`.

**Step 3: Remove the interface (no longer needed)**

Since the component no longer accepts props, remove any `LayoutProps` interface.

## Why This Works

In React Router's architecture:

1. **Layouts are route components** that wrap child routes, not React component children
2. **`<Outlet />`** is a placeholder that renders whatever child route matches the current URL
3. **`{children}`** is for direct React component composition, which React Router doesn't use for route nesting

When you use `{children}`, React Router doesn't pass anything there because it expects you to use `<Outlet />`. The variable is `undefined`, resulting in an empty render.

## Prevention

### Code Review Checklist

When reviewing layouts in React Router applications:

- [ ] Layout uses `<Outlet />` not `{children}` for nested route content
- [ ] `import { Outlet } from "react-router"` is present
- [ ] Layout component has no `children` prop in its interface

### Quick Detection

If a layout's content area is empty, immediately check:

```bash
# Search for layouts using children pattern (potential bug)
grep -r "children.*ReactNode" apps/web/app --include="*layout.tsx"

# Verify Outlet usage
grep -r "Outlet" apps/web/app --include="*layout.tsx"
```

### Framework Comparison Reference

| Framework          | Layout Pattern         | How to Render Nested Content |
| ------------------ | ---------------------- | ---------------------------- |
| Next.js App Router | `{children}` prop      | `{children}`                 |
| React Router       | `<Outlet />` component | `<Outlet />`                 |
| Remix              | `<Outlet />` component | `<Outlet />`                 |
| Vue Router         | `<router-view />`      | `<router-view />`            |

## Related Files

- `apps/web/app/(all)/[workspaceSlug]/(resources)/resources/layout.tsx` - Fixed in this session
- `apps/web/app/routes/core.ts` - Route configuration using `layout()` and `route()`

## Related Issues

- Workspace Modes Phase 1 PR #33 - Resources page content not rendering
