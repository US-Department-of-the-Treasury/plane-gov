# TanStack Query Migration Summary

## Files Migrated (10 files)

### 1. ✅ relations/properties.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Removed `observer()` wrapper (no longer uses MobX)
- Added `projectId` prop to component
- Import: `import { useIssue } from "@/store/queries/issue"`

### 2. ✅ relations/issue-list-item.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Kept `observer()` wrapper (still uses other MobX stores for UI state)
- Updated `RelationIssueProperty` to pass `projectId` prop
- Import: `import { useIssue } from "@/store/queries/issue"`

### 3. ✅ peek-overview/properties.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Kept `observer()` wrapper (still uses other MobX stores)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 4. ✅ peek-overview/issue-detail.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Kept `observer()` wrapper (still uses other MobX stores)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 5. ✅ peek-overview/header.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Kept `observer()` wrapper (still uses other MobX stores for UI state)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 6. ✅ peek-overview/view.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue(workspaceSlug, projectId, issueId)`
- Kept `observer()` wrapper (still uses other MobX stores for UI state)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 7. ✅ peek-overview/root.tsx
**Changes:**
- Migrated `update`, `remove`, and `archive` operations to TanStack Query mutations
- Added mutation hooks: `useUpdateIssue()`, `useDeleteIssue()`, `useArchiveIssue()`
- Replaced MobX store calls with mutation hooks in `issueOperations`
- Kept `observer()` wrapper (still uses other MobX stores)
- Import: `import { useUpdateIssue, useDeleteIssue, useArchiveIssue } from "@/store/queries/issue"`

### 8. ✅ issue-modal/form.tsx
**Changes:**
- Replaced `useIssueDetail().issue.getIssueById()` with `useIssue()` for parent issue fetching
- Updated parent issue effect to use `parentIssue` from TanStack Query
- Kept `observer()` wrapper (still uses other MobX stores)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 9. ✅ issue-modal/base.tsx
**Changes:**
- Replaced `fetchIssue()` call with `useIssue()` hook for fetching issue details
- Simplified `useEffect` to use `fetchedIssue` from TanStack Query
- Removed manual `fetchIssueDetail` function
- Kept `observer()` wrapper (still uses MobX for create/update operations)
- Import: `import { useIssue } from "@/store/queries/issue"`

### 10. ✅ workspace-root.tsx
**Status:** No changes needed
**Reason:** This file works with issue lists/groups (not individual issue data), which are still managed by MobX stores. It doesn't use `getIssueById` or `issueMap` patterns.

## Migration Pattern Applied

### Data Fetching
- **Before:** `const issue = getIssueById(issueId)`
- **After:** `const { data: issue } = useIssue(workspaceSlug, projectId, issueId)`

### Mutations
- **Before:** `await issues.updateIssue(workspaceSlug, projectId, issueId, data)`
- **After:** 
  ```typescript
  const { mutateAsync: updateIssue } = useUpdateIssue();
  await updateIssue({ workspaceSlug, projectId, issueId, data });
  ```

### Observer Wrapper
- **Kept:** When component still uses other MobX stores (UI state, other operations)
- **Removed:** When component no longer uses any MobX stores

## Key Points

1. **UI State Still in MobX:** Components kept `useIssueDetail()` for UI state operations like `peekIssue`, `setPeekIssue`, `toggleCreateIssueModal`, etc.

2. **Issue Data from TanStack Query:** All issue data access now uses TanStack Query hooks for better caching and synchronization.

3. **Mutations Migrated:** Update, delete, and archive operations now use TanStack Query mutations with optimistic updates.

4. **List Operations in MobX:** Issue lists, filters, and grouping remain in MobX stores (not migrated in this batch).

## Files Changed
- `/apps/web/core/components/issues/relations/properties.tsx`
- `/apps/web/core/components/issues/relations/issue-list-item.tsx`
- `/apps/web/core/components/issues/peek-overview/properties.tsx`
- `/apps/web/core/components/issues/peek-overview/issue-detail.tsx`
- `/apps/web/core/components/issues/peek-overview/header.tsx`
- `/apps/web/core/components/issues/peek-overview/view.tsx`
- `/apps/web/core/components/issues/peek-overview/root.tsx`
- `/apps/web/core/components/issues/issue-modal/form.tsx`
- `/apps/web/core/components/issues/issue-modal/base.tsx`

## Testing Recommendations

1. Test issue peek overview functionality
2. Test issue editing modal
3. Test issue relations
4. Test issue property updates
5. Test issue delete/archive operations
6. Verify optimistic updates work correctly
7. Test error handling for failed mutations
