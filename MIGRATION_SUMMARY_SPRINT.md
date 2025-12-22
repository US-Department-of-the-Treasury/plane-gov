# MobX to TanStack Query Migration - Sprint Hooks

## Summary
Successfully migrated 4 files from MobX `useSprint()` to TanStack Query hooks.

## Files Migrated

### 1. apps/web/core/components/readonly/sprint.tsx
**Changes:**
- Removed: `import { useSprint } from "@/hooks/store/use-sprint"`
- Removed: `import { observer } from "mobx-react"`
- Removed: `observer()` wrapper (component no longer uses any MobX stores)
- Added: `import { useProjectSprints, getSprintNameById } from "@/store/queries/sprint"`
- Replaced: `useSprint()` with `useProjectSprints(workspaceSlug, projectId || "")`
- Replaced: `getSprintNameById(value)` with `getSprintNameById(sprints, value)`
- Removed: Manual `fetchAllSprints()` call in useEffect (TanStack Query auto-fetches)

**Pattern:**
```typescript
// Before
const { getSprintNameById, fetchAllSprints } = useSprint();
useEffect(() => {
  if (projectId) fetchAllSprints(workspaceSlug, projectId);
}, [projectId, workspaceSlug]);
const sprintName = value ? getSprintNameById(value) : null;

// After
const { data: sprints } = useProjectSprints(workspaceSlug, projectId || "");
const sprintName = value ? getSprintNameById(sprints, value) : null;
```

### 2. apps/web/ce/components/resource-view/resource-matrix.tsx
**Changes:**
- Removed: `import { useSprint } from "@/hooks/store/use-sprint"`
- Added: `import { useWorkspaceSprints, getSprintIds, getActiveSprint, getSprintById } from "@/store/queries/sprint"`
- Replaced: `useSprint()` with `useWorkspaceSprints(workspaceSlug)`
- Replaced: `sprintStore.currentWorkspaceSprintIds` with `getSprintIds(sprints)`
- Replaced: `sprintStore.currentWorkspaceActiveSprintId` with `getActiveSprint(sprints)?.id`
- Replaced: `sprintStore.getSprintById(sprintId)` with `getSprintById(sprints, sprintId)`
- Replaced: `sprintStore.loader` with `isLoading` from TanStack Query
- **Kept:** `observer()` wrapper (still uses MobX `useMember()`)

**Pattern:**
```typescript
// Before
const sprintStore = useSprint();
const sprintIds = sprintStore.currentWorkspaceSprintIds;
const activeSprintId = sprintStore.currentWorkspaceActiveSprintId;
const isLoading = !memberIds || !sprintIds || sprintStore.loader;
const sprint = sprintStore.getSprintById(sprintId);

// After
const { data: sprints, isLoading: sprintsLoading } = useWorkspaceSprints(workspaceSlug);
const sprintIds = getSprintIds(sprints);
const activeSprint = getActiveSprint(sprints);
const activeSprintId = activeSprint?.id;
const isLoading = !memberIds || !sprintIds || sprintsLoading;
const sprint = getSprintById(sprints, sprintId);
```

### 3. apps/web/ce/components/resource-view/root.tsx
**Changes:**
- Removed: `import { useSprint } from "@/hooks/store/use-sprint"`
- Added: `import { useWorkspaceSprints } from "@/store/queries/sprint"`
- Replaced: Manual `sprintStore.fetchWorkspaceSprints()` call with declarative `useWorkspaceSprints()` hook
- Removed: `sprintStore` from useEffect dependencies
- **Kept:** `observer()` wrapper (still uses MobX `useMember()` and `useWorkspace()`)

**Pattern:**
```typescript
// Before
const sprintStore = useSprint();
useEffect(() => {
  if (!workspaceSlug) return;
  void sprintStore.fetchWorkspaceSprints(workspaceSlug);
}, [workspaceSlug, sprintStore]);

// After
// TanStack Query automatically fetches sprints - no manual fetch needed
useWorkspaceSprints(workspaceSlug || "");
```

### 4. apps/web/core/hooks/use-favorite-item-details.tsx
**Changes:**
- Removed: `import { useSprint } from "@/hooks/store/use-sprint"`
- Added: `import { useProjectSprints, getSprintById } from "@/store/queries/sprint"`
- Replaced: `const { getSprintById } = useSprint()` with `const { data: sprints } = useProjectSprints(workspaceSlug, favorite.project_id ?? "")`
- Replaced: `getSprintById(favoriteItemId)` with `getSprintById(sprints, favoriteItemId)`
- **Note:** This hook doesn't use `observer()` wrapper (already a custom hook, not a component)

**Pattern:**
```typescript
// Before
const { getSprintById } = useSprint();
const sprintDetail = getSprintById(favoriteItemId ?? "");

// After
const { data: sprints } = useProjectSprints(workspaceSlug, favorite.project_id ?? "");
const sprintDetail = getSprintById(sprints, favoriteItemId ?? "");
```

## Files Not Requiring Migration

### 5. apps/web/core/components/issues/issue-layouts/quick-action-dropdowns/helper.tsx
- **No migration needed:** Does not import or use `useSprint()` from MobX
- Contains `useSprintIssueMenuItems` which is a local function, not the MobX hook

### 6. apps/web/core/hooks/use-issues-actions.tsx
- **No migration needed:** Does not import or use `useSprint()` from MobX
- Contains `useSprintIssueActions` which is a local function, not the MobX hook

## TanStack Query Hooks Used

### Read Operations
- `useProjectSprints(workspaceSlug, projectId)` - Fetch all sprints for a project
- `useWorkspaceSprints(workspaceSlug)` - Fetch all sprints across workspace

### Utility Functions
- `getSprintById(sprints, sprintId)` - Get sprint by ID from array
- `getSprintNameById(sprints, sprintId)` - Get sprint name by ID
- `getSprintIds(sprints)` - Get array of sprint IDs
- `getActiveSprint(sprints)` - Get currently active sprint

## Key Migration Patterns

### 1. Remove Manual Fetching
TanStack Query hooks automatically fetch data when components mount. Remove manual `fetch*()` calls in useEffect:

```typescript
// ❌ MobX - Manual fetching
useEffect(() => {
  fetchAllSprints(workspaceSlug, projectId);
}, [workspaceSlug, projectId]);

// ✅ TanStack Query - Automatic fetching
const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
```

### 2. Replace Store Methods with Utility Functions
MobX store methods become pure utility functions that operate on data:

```typescript
// ❌ MobX - Store method
const name = sprintStore.getSprintNameById(sprintId);

// ✅ TanStack Query - Utility function
const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
const name = getSprintNameById(sprints, sprintId);
```

### 3. Loading States
Use TanStack Query's built-in loading states instead of store loaders:

```typescript
// ❌ MobX
const isLoading = sprintStore.loader;

// ✅ TanStack Query
const { data: sprints, isLoading } = useProjectSprints(workspaceSlug, projectId);
```

### 4. Observer Wrapper Decision
Only keep `observer()` wrapper if component uses OTHER MobX stores:

```typescript
// ❌ Remove observer if ONLY sprint data is used
export const ReadonlySprint = observer(function ReadonlySprint(props) { ... });

// ✅ Keep observer if OTHER MobX stores are still used
export const ResourceMatrix = observer(function ResourceMatrix(props) {
  const { workspace: workspaceMemberStore } = useMember(); // Still MobX
  const { data: sprints } = useWorkspaceSprints(workspaceSlug); // TanStack Query
});
```

## Verification

All migrations verified:
- ✅ No remaining MobX `useSprint` imports
- ✅ All files now import from `@/store/queries/sprint`
- ✅ Observer wrappers correctly preserved/removed
- ✅ No compilation errors

## Next Steps

Continue migrating other MobX stores to TanStack Query following these same patterns.
