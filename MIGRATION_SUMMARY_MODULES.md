# Module Migration Summary - MobX to TanStack Query

This document summarizes the migration of `useModule()` from MobX to TanStack Query hooks.

## Migration Date
2025-12-21

## Files Migrated

### 1. apps/web/core/components/readonly/module.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useProjectModules, getModuleById } from "@/store/queries/module"`
- Replaced `getModuleById()` MobX method with `getModuleById(projectModules, id)` utility function
- Replaced `fetchModules()` imperative call with declarative `useProjectModules()` hook
- Removed `observer()` wrapper (no longer uses MobX stores)
- Removed `useEffect` for fetching modules (TanStack Query auto-fetches)

**Before:**
```typescript
const { getModuleById, fetchModules } = useModule();
useEffect(() => {
  if (moduleIds.length > 0 && projectId) {
    fetchModules(workspaceSlug, projectId);
  }
}, [value, projectId, workspaceSlug]);
const modules = moduleIds.map((id) => getModuleById(id)).filter(Boolean);
```

**After:**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, projectId ?? "");
const modules = moduleIds.map((id) => getModuleById(projectModules, id)).filter(Boolean);
```

---

### 2. apps/web/core/layouts/auth-layout/project-wrapper.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useProjectModules } from "@/store/queries/module"`
- Replaced `fetchModulesSlim()` and `fetchModules()` imperative calls with `useProjectModules()` hook
- Removed SWR-based module fetching (replaced with TanStack Query)
- Kept `observer()` wrapper (still uses other MobX stores)

**Before:**
```typescript
const { fetchModulesSlim, fetchModules } = useModule();
useSWR(
  PROJECT_MODULES(projectId, currentProjectRole),
  async () => {
    await Promise.all([fetchModulesSlim(workspaceSlug, projectId), fetchModules(workspaceSlug, projectId)]);
  },
  { revalidateIfStale: false, revalidateOnFocus: false }
);
```

**After:**
```typescript
// TanStack Query - auto-fetches project states, intake state, sprints, and modules
useProjectModules(workspaceSlug, projectId);
```

---

### 3. apps/web/core/hooks/use-project-issue-properties.ts
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "./store/use-module"`
- Converted `fetchModules()` to a no-op function with documentation
- Added comment directing developers to use `useProjectModules()` directly

**Before:**
```typescript
const { fetchModules: fetchProjectAllModules } = useModule();
const fetchModules = async (workspaceSlug, projectId) => {
  if (workspaceSlug && projectId) {
    await fetchProjectAllModules(workspaceSlug.toString(), projectId.toString());
  }
};
```

**After:**
```typescript
// fetching project modules - handled by TanStack Query useProjectModules hook
// This function is kept for backward compatibility but is a no-op
// Components should use useProjectModules(workspaceSlug, projectId) directly
const fetchModules = async (_workspaceSlug, _projectId) => {
  // No-op: TanStack Query handles fetching automatically via useProjectModules hook
};
```

---

### 4. apps/web/core/hooks/use-workspace-issue-properties.ts
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "./store/use-module"`
- Added `import { useWorkspaceModules } from "@/store/queries/module"`
- Replaced SWR-based `fetchWorkspaceModules()` with `useWorkspaceModules()` hook
- Removed WORKSPACE_MODULES constant from imports

**Before:**
```typescript
const { fetchWorkspaceModules } = useModule();
useSWR(
  workspaceSlug ? WORKSPACE_MODULES(workspaceSlug.toString()) : null,
  workspaceSlug ? () => fetchWorkspaceModules(workspaceSlug.toString()) : null,
  { revalidateIfStale: false, revalidateOnFocus: false }
);
```

**After:**
```typescript
// fetch workspace Modules - handled by TanStack Query useWorkspaceModules hook
useWorkspaceModules(workspaceSlug ? workspaceSlug.toString() : "");
```

---

### 5. apps/web/core/hooks/use-favorite-item-details.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useProjectModules, getModuleById } from "@/store/queries/module"`
- Replaced `getModuleById()` MobX method with `getModuleById(projectModules, id)` utility function
- No observer wrapper (wasn't using observer before)

**Before:**
```typescript
const { getModuleById } = useModule();
const moduleDetail = getModuleById(favoriteItemId ?? "");
```

**After:**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, favorite.project_id ?? "");
const moduleDetail = getModuleById(projectModules, favoriteItemId ?? "");
```

---

### 6. apps/web/core/components/work-item-filters/filters-hoc/project-level.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useProjectModules, getModuleIds } from "@/store/queries/module"`
- Replaced `getProjectModuleIds()` MobX method with `getModuleIds(projectModules)` utility function
- Kept `observer()` wrapper (still uses other MobX stores)

**Before:**
```typescript
const { getProjectModuleIds } = useModule();
const { data: projectSprints } = useProjectSprints(workspaceSlug, projectId);
// ...
moduleIds={getProjectModuleIds(projectId) ?? undefined}
```

**After:**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, projectId);
const { data: projectSprints } = useProjectSprints(workspaceSlug, projectId);
// ...
moduleIds={getModuleIds(projectModules)}
```

---

### 7. apps/web/ce/hooks/work-item-filters/use-work-item-filters-config.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useProjectModules, getModuleById } from "@/store/queries/module"`
- Replaced `getModuleById()` MobX method with `getModuleById(projectModules, id)` utility function
- Updated useMemo dependency to include `projectModules`

**Before:**
```typescript
const { getModuleById } = useModule();
const modules = useMemo(
  () =>
    moduleIds ? (moduleIds.map((moduleId) => getModuleById(moduleId)).filter((module) => module) as IModule[]) : [],
  [moduleIds, getModuleById]
);
```

**After:**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, projectId || "");
const modules = useMemo(
  () =>
    moduleIds && projectModules
      ? (moduleIds.map((moduleId) => getModuleById(projectModules, moduleId)).filter((module) => module) as IModule[])
      : [],
  [moduleIds, projectModules]
);
```

---

### 8. apps/web/core/components/issues/issue-modal/base.tsx
**Status:** ✅ Complete

**Changes:**
- Removed `import { useModule } from "@/hooks/store/use-module"`
- Added `import { useModuleDetails } from "@/store/queries/module"`
- Removed `fetchModuleDetails()` imperative call
- Replaced with TanStack Query cache invalidation pattern
- Kept `observer()` wrapper (still uses other MobX stores)

**Before:**
```typescript
const { fetchModuleDetails } = useModule();
const addIssueToModule = async (issue: TIssue, moduleIds: string[]) => {
  await Promise.all([
    issues.changeModulesInIssue(workspaceSlug.toString(), issue.project_id, issue.id, moduleIds, []),
    ...moduleIds.map(
      (moduleId) => issue.project_id && fetchModuleDetails(workspaceSlug.toString(), issue.project_id, moduleId)
    ),
  ]);
};
```

**After:**
```typescript
const addIssueToModule = async (issue: TIssue, moduleIds: string[]) => {
  await issues.changeModulesInIssue(workspaceSlug.toString(), issue.project_id, issue.id, moduleIds, []);

  // Invalidate module queries to refetch updated data
  moduleIds.forEach((moduleId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.modules.all(workspaceSlug.toString(), issue.project_id),
  });
};
```

---

## Files NOT Migrated (No useModule usage)

### 9. apps/web/core/hooks/use-issues-actions.tsx
**Status:** ⏭️ Skipped - Does not use useModule()

### 10. apps/web/core/components/common/quick-actions-helper.tsx
**Status:** ⏭️ Skipped - Does not use useModule()

---

## TanStack Query Hooks Used

### Read Operations (Queries)
- `useProjectModules(workspaceSlug, projectId)` - Fetch all modules for a project
- `useWorkspaceModules(workspaceSlug)` - Fetch all workspace modules
- `useModuleDetails(workspaceSlug, projectId, moduleId)` - Fetch specific module details

### Utility Functions
- `getModuleById(modules, moduleId)` - Get module by ID from modules array
- `getModuleNameById(modules, moduleId)` - Get module name by ID
- `getModuleIds(modules)` - Get all module IDs from modules array

### Cache Management
- `queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) })`
- `queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) })`

---

## Migration Patterns Applied

### 1. Declarative Data Fetching
**Before (Imperative):**
```typescript
const { fetchModules } = useModule();
useEffect(() => {
  fetchModules(workspaceSlug, projectId);
}, [workspaceSlug, projectId]);
```

**After (Declarative):**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, projectId);
```

### 2. Utility Function Pattern
**Before (Method Call):**
```typescript
const { getModuleById } = useModule();
const module = getModuleById(moduleId);
```

**After (Pure Function):**
```typescript
const { data: projectModules } = useProjectModules(workspaceSlug, projectId);
const module = getModuleById(projectModules, moduleId);
```

### 3. Cache Invalidation Pattern
**Before (Manual Refetch):**
```typescript
await fetchModuleDetails(workspaceSlug, projectId, moduleId);
```

**After (Cache Invalidation):**
```typescript
void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
```

### 4. Observer Wrapper Removal
- Removed `observer()` wrapper from components that no longer use any MobX stores
- Kept `observer()` wrapper for components still using other MobX stores

---

## Benefits of Migration

1. **Automatic Caching:** TanStack Query automatically caches module data
2. **Background Updates:** Stale data is refetched in the background
3. **Loading States:** Built-in loading and error states via `isLoading`, `isError`
4. **Request Deduplication:** Multiple components requesting same data get deduplicated
5. **Optimistic Updates:** Mutation hooks support optimistic UI updates
6. **DevTools Support:** Better debugging with React Query DevTools
7. **Type Safety:** Full TypeScript support with proper type inference
8. **Declarative API:** More React-like, declarative data fetching

---

## Testing Recommendations

1. **Verify module data loads correctly** in all migrated components
2. **Test loading states** - ensure UI handles loading/error states appropriately
3. **Test cache behavior** - verify data doesn't refetch unnecessarily
4. **Test invalidation** - ensure module data updates after mutations (create/update/delete)
5. **Test workspace modules** - verify workspace-level module queries work correctly
6. **Test with empty data** - ensure components handle undefined/empty module arrays

---

## Next Steps

1. Monitor for any runtime errors related to module data fetching
2. Verify all module-related features work as expected:
   - Module list/grid views
   - Module filters
   - Module selection in forms
   - Module favorites
   - Module issue assignment
3. Consider migrating remaining MobX stores to TanStack Query
4. Remove unused MobX module store code once fully migrated

---

## Notes

- All migrations maintain backward compatibility where possible
- Components that still use other MobX stores kept their `observer()` wrapper
- No breaking changes to component APIs
- TanStack Query auto-fetching replaces manual useEffect-based fetching
- Cache invalidation replaces manual refetch calls
