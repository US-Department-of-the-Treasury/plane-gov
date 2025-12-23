# Issue Stores Migration Guide: MobX to TanStack Query + Zustand

## Overview

This document provides the migration strategy for the complex issue stores system in Plane, moving from MobX to TanStack Query + Zustand.

## Architecture Analysis

### Current MobX Architecture

```
Root Store (IssueRootStore)
├── IssueStore (simple map store) ✅ MIGRATED
├── BaseIssuesStore (complex base class ~1950 lines)
│   ├── ArchivedIssues
│   ├── ProjectIssues
│   ├── SprintIssues
│   ├── EpicIssues
│   ├── ProfileIssues
│   ├── WorkspaceIssues
│   ├── WorkspaceDraftIssues
│   └── ProjectViewIssues
└── View Stores
    ├── IssueKanBanViewStore
    ├── CalendarStore
    └── GanttStore
```

### Key Challenges

1. **BaseIssuesStore Complexity**: ~1950 lines combining:
   - Server state (API data)
   - Derived state (grouped/sorted issue IDs)
   - UI state (loaders, pagination)
   - Complex business logic (grouping, subgrouping, sorting)

2. **Deep Interdependencies**: Stores reference each other extensively

3. **State Management Patterns**:
   - Observable maps (issuesMap, groupedIssueIds)
   - Computed values (groupBy, subGroupBy, orderBy)
   - Actions with runInAction
   - Pagination state management

## Migration Strategy

### Phase 1: Foundation (✅ Complete)

**File**: `apps/web/core/store/issue/issue.store.ts`

- ✅ Migrated to Zustand
- ✅ Removed MobX imports (makeObservable, observable, action, runInAction)
- ✅ Created `useIssueStore` hook with Zustand
- ✅ Added backward-compatible `IssueStore` class wrapper
- ✅ Maintained same API surface

**Pattern**:
```typescript
// Old MobX
class IssueStore {
  @observable issuesMap = {};

  @action
  addIssue = (issues) => {
    runInAction(() => {
      // mutations
    });
  };

  @computed
  getIssueById = computedFn((id) => this.issuesMap[id]);
}

// New Zustand
export const useIssueStore = create<IIssueStore>((set, get) => ({
  issuesMap: {},

  addIssue: (issues) => {
    set((state) => ({
      issuesMap: { ...state.issuesMap, /* updates */ }
    }));
  },

  getIssueById: (id) => {
    return get().issuesMap[id];
  },
}));

// Backward-compatible wrapper
export class IssueStore {
  get issuesMap() {
    return useIssueStore.getState().issuesMap;
  }

  addIssue = (issues) => {
    useIssueStore.getState().addIssue(issues);
  };
}
```

### Phase 2: BaseIssuesStore Refactor (Next Step)

**File**: `apps/web/core/store/issue/helpers/base-issues.store.ts`

This is the most complex migration. Strategy:

#### 2.1: Separate Concerns

**Server State → TanStack Query**:
- API calls (fetchIssues, fetchNextIssues)
- Use existing hooks from `/apps/web/core/store/queries/issue.ts`

**Local State → Zustand**:
- groupedIssueIds
- issuePaginationData
- groupedIssueCount
- loader states

**Business Logic → Pure Functions**:
- Sorting algorithms (issuesSortWithOrderBy)
- Grouping logic (getUpdateDetails, getGroupIssueKeyActions)
- Pagination calculations

#### 2.2: Create Zustand Store for BaseIssues

```typescript
// apps/web/core/store/issue/helpers/use-base-issues-store.ts

import { create } from "zustand";
import type {
  TGroupedIssues,
  TSubGroupedIssues,
  TLoader,
  TIssuePaginationData,
  TGroupedIssueCount,
} from "@plane/types";

interface BaseIssuesState {
  // State
  loader: Record<string, TLoader>;
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues | undefined;
  issuePaginationData: TIssuePaginationData;
  groupedIssueCount: TGroupedIssueCount;
  paginationOptions: IssuePaginationOptions | undefined;

  // Actions
  setLoader: (loaderValue: TLoader, groupId?: string, subGroupId?: string) => void;
  clear: (shouldClearPaginationOptions?: boolean) => void;
  setPaginationData: (
    prevCursor: string,
    nextCursor: string,
    nextPageResults: boolean,
    groupId?: string,
    subGroupId?: string
  ) => void;
  updateGroupedIssueIds: (
    groupedIssues: TIssues,
    groupedIssueCount: TGroupedIssueCount,
    groupId?: string,
    subGroupId?: string
  ) => void;
  addIssueToGroup: (issueId: string, groupId?: string, subGroupId?: string) => void;
  removeIssueFromGroup: (issueId: string, groupId?: string, subGroupId?: string) => void;
}

export const useBaseIssuesStore = create<BaseIssuesState>((set, get) => ({
  loader: {},
  groupedIssueIds: undefined,
  issuePaginationData: {},
  groupedIssueCount: {},
  paginationOptions: undefined,

  setLoader: (loaderValue, groupId, subGroupId) => {
    set((state) => ({
      loader: {
        ...state.loader,
        [getGroupKey(groupId, subGroupId)]: loaderValue,
      },
    }));
  },

  clear: (shouldClearPaginationOptions = true) => {
    set({
      groupedIssueIds: undefined,
      issuePaginationData: {},
      groupedIssueCount: {},
      ...(shouldClearPaginationOptions && { paginationOptions: undefined }),
    });
  },

  // ... other actions
}));
```

#### 2.3: Extract Pure Functions

```typescript
// apps/web/core/store/issue/helpers/issue-utils.ts

/**
 * Pure functions for issue sorting, grouping, and pagination logic.
 * These don't depend on MobX or Zustand - just pure TypeScript.
 */

export function issuesSortWithOrderBy(
  issues: TIssue[],
  orderBy: TIssueOrderByOptions,
  stateMap: Record<string, IState>,
  labelMap: Record<string, IIssueLabel>,
  // ... other maps
): string[] {
  // Copy sorting logic from BaseIssuesStore
  // No observable/computed - just pure functions
}

export function getGroupIssueKeyActions(
  addGroups: string[],
  deleteGroups: string[]
): { path: string[]; action: EIssueGroupedAction }[] {
  // Pure function - no side effects
}

export function processIssueResponse(
  issueResponse: TIssuesResponse
): {
  issueList: TIssue[];
  groupedIssues: TIssues;
  groupedIssueCount: TGroupedIssueCount;
} {
  // Pure function for processing API responses
}
```

#### 2.4: Create Custom Hooks

```typescript
// apps/web/core/store/issue/helpers/use-base-issues.ts

import { useIssues } from "@/store/queries/issue";
import { useBaseIssuesStore } from "./use-base-issues-store";

/**
 * Custom hook that combines TanStack Query for server state
 * and Zustand for local state management.
 */
export function useBaseIssues(
  workspaceSlug: string,
  projectId: string,
  filters?: Partial<TIssueParams>
) {
  const store = useBaseIssuesStore();

  // Fetch issues using TanStack Query
  const { data: issues, isLoading } = useIssues(
    workspaceSlug,
    projectId,
    filters
  );

  // When issues load, update Zustand store
  useEffect(() => {
    if (issues) {
      const { issueList, groupedIssues, groupedIssueCount } =
        processIssueResponse(issues);

      useIssueStore.getState().addIssue(issueList);
      store.updateGroupedIssueIds(groupedIssues, groupedIssueCount);
      store.setLoader(undefined);
    }
  }, [issues]);

  return {
    issues,
    isLoading,
    groupedIssueIds: store.groupedIssueIds,
    loader: store.loader,
    getIssueIds: store.getIssueIds,
    // ... other methods
  };
}
```

### Phase 3: Individual Issue Stores

**Files to migrate**:
- `archived/issue.store.ts`
- `project/issue.store.ts`
- `sprint/issue.store.ts`
- `epic/issue.store.ts`
- `profile/issue.store.ts`
- `workspace/issue.store.ts`
- `workspace-draft/issue.store.ts`
- `project-views/issue.store.ts`

**Pattern**: Each extends BaseIssuesStore with:
- Specific fetch methods
- View flags
- Context-specific overrides

**Migration Strategy**:

```typescript
// Old MobX (example: ProjectIssues)
export class ProjectIssues extends BaseIssuesStore {
  viewFlags = { enableQuickAdd: true };

  fetchIssues = async (workspaceSlug, projectId, loadType, options) => {
    runInAction(() => {
      this.setLoader(loadType);
      this.clear();
    });

    const response = await this.issueService.getIssues(...);
    this.onfetchIssues(response, options, ...);
    return response;
  };
}

// New Zustand + TanStack Query
export function useProjectIssues(
  workspaceSlug: string,
  projectId: string
) {
  const baseStore = useBaseIssuesStore();
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();

  // Use TanStack Query for fetching
  const { data, isLoading, fetchNextPage } = useInfiniteQuery({
    queryKey: queryKeys.issues.filtered(workspaceSlug, projectId),
    queryFn: ({ pageParam }) =>
      issueService.getIssues(workspaceSlug, projectId, { ...filters, cursor: pageParam }),
    onSuccess: (response) => {
      const { issueList, groupedIssues, groupedIssueCount } =
        processIssueResponse(response);

      useIssueStore.getState().addIssue(issueList);
      baseStore.updateGroupedIssueIds(groupedIssues, groupedIssueCount);
    },
  });

  return {
    issues: data,
    isLoading,
    viewFlags: { enableQuickAdd: true, enableIssueCreation: true },
    groupedIssueIds: baseStore.groupedIssueIds,
    createIssue: createIssue.mutate,
    updateIssue: updateIssue.mutate,
    fetchNextPage,
  };
}

// Backward-compatible class wrapper
export class ProjectIssues {
  private workspaceSlug: string;
  private projectId: string;

  constructor(workspaceSlug: string, projectId: string) {
    this.workspaceSlug = workspaceSlug;
    this.projectId = projectId;
  }

  get viewFlags() {
    return { enableQuickAdd: true, enableIssueCreation: true };
  }

  fetchIssues = async (workspaceSlug, projectId, loadType, options) => {
    // Delegate to TanStack Query
    const queryClient = getQueryClient();
    return await queryClient.fetchQuery({
      queryKey: queryKeys.issues.filtered(workspaceSlug, projectId),
      queryFn: () => issueService.getIssues(workspaceSlug, projectId, options),
    });
  };
}
```

### Phase 4: Root Store

**File**: `apps/web/core/store/issue/root.store.ts`

**Migration Strategy**:

The root store currently uses MobX `autorun` to sync router state. Replace with:

```typescript
// Old MobX
export class IssueRootStore {
  @observable workspaceSlug: string | undefined;
  @observable projectId: string | undefined;

  constructor(rootStore: RootStore) {
    makeObservable(this, {
      workspaceSlug: observable.ref,
      projectId: observable.ref,
    });

    autorun(() => {
      runInAction(() => {
        if (this.workspaceSlug !== rootStore.router.workspaceSlug) {
          this.workspaceSlug = rootStore.router.workspaceSlug;
        }
      });
    });

    this.issues = new IssueStore();
    this.projectIssues = new ProjectIssues(this, this.projectIssuesFilter);
  }
}

// New Zustand
interface IssueRootState {
  workspaceSlug: string | undefined;
  projectId: string | undefined;
  sprintId: string | undefined;
  epicId: string | undefined;
  // ... other router state

  // Actions
  setWorkspaceSlug: (slug: string) => void;
  setProjectId: (id: string) => void;
  // ... other setters
}

export const useIssueRootStore = create<IssueRootState>((set) => ({
  workspaceSlug: undefined,
  projectId: undefined,
  sprintId: undefined,
  epicId: undefined,

  setWorkspaceSlug: (slug) => set({ workspaceSlug: slug }),
  setProjectId: (id) => set({ projectId: id }),
  // ... other setters
}));

// Hook to sync with router
export function useIssueRootSync() {
  const router = useRouter();
  const { setWorkspaceSlug, setProjectId, setSprintId, setEpicId } =
    useIssueRootStore();

  useEffect(() => {
    setWorkspaceSlug(router.workspaceSlug);
    setProjectId(router.projectId);
    setSprintId(router.sprintId);
    setEpicId(router.epicId);
  }, [
    router.workspaceSlug,
    router.projectId,
    router.sprintId,
    router.epicId,
  ]);
}

// Use in app root or layout
function IssueStoreProvider({ children }: { children: React.ReactNode }) {
  useIssueRootSync();
  return <>{children}</>;
}
```

### Phase 5: View Stores

**Files**:
- `issue_kanban_view.store.ts`
- `issue_calendar_view.store.ts`
- `issue_gantt_view.store.ts`

These stores manage UI-specific state (drag-and-drop, calendar positioning, etc.).

**Migration**: Pure UI state → Zustand only (no TanStack Query needed)

```typescript
// example: useKanbanViewStore
export const useKanbanViewStore = create<IKanbanViewStore>((set, get) => ({
  kanbanToggle: { group_by: [], sub_group_by: [] },
  kanbanFilters: {},

  handleKanbanToggle: (toggle, value) => {
    set((state) => ({
      kanbanToggle: {
        ...state.kanbanToggle,
        [toggle]: value,
      },
    }));
  },

  handleKanbanFilters: (toggle, value) => {
    set((state) => ({
      kanbanFilters: {
        ...state.kanbanFilters,
        [toggle]: value,
      },
    }));
  },
}));
```

## Migration Checklist

### Per-File Checklist

For each store file:

- [ ] Remove MobX imports
  ```typescript
  // Remove:
  import { makeObservable, observable, action, computed, runInAction } from "mobx";
  import { computedFn } from "mobx-utils";
  ```

- [ ] Create Zustand store
  ```typescript
  import { create } from "zustand";

  export const useXStore = create<IXStore>((set, get) => ({
    // state and actions
  }));
  ```

- [ ] Replace `@observable` with Zustand state
- [ ] Replace `@action` with Zustand actions using `set()`
- [ ] Replace `@computed` and `computedFn` with regular functions using `get()`
- [ ] Replace `runInAction` with `set()` calls
- [ ] Move API calls to TanStack Query hooks
- [ ] Create backward-compatible class wrapper (if needed)
- [ ] Add JSDoc comments and migration examples
- [ ] Test all CRUD operations
- [ ] Test pagination
- [ ] Test grouping/filtering
- [ ] Remove the class after all consumers migrated

### Testing Strategy

1. **Unit Tests**: Test pure functions independently
2. **Integration Tests**: Test Zustand store + TanStack Query integration
3. **E2E Tests**: Test full user workflows (Playwright)
4. **Visual Regression**: Ensure UI looks identical

### Rollout Strategy

1. **Feature Flag**: Control migration per store
2. **Gradual Rollout**: Migrate one store at a time
3. **Backward Compatibility**: Keep class wrappers during transition
4. **Monitor**: Watch for errors, performance regressions
5. **Cleanup**: Remove MobX and class wrappers once stable

## Key Patterns

### Pattern 1: Observable → Zustand State

```typescript
// Before (MobX)
@observable issuesMap: Record<string, TIssue> = {};

// After (Zustand)
export const useStore = create<Store>((set) => ({
  issuesMap: {},
  setIssuesMap: (map) => set({ issuesMap: map }),
}));
```

### Pattern 2: Action → Zustand Action

```typescript
// Before (MobX)
@action
addIssue = (issue: TIssue) => {
  runInAction(() => {
    this.issuesMap[issue.id] = issue;
  });
};

// After (Zustand)
addIssue: (issue: TIssue) => {
  set((state) => ({
    issuesMap: {
      ...state.issuesMap,
      [issue.id]: issue,
    },
  }));
},
```

### Pattern 3: Computed → Regular Function

```typescript
// Before (MobX)
@computed
get activeIssues() {
  return this.issues.filter(i => !i.archived_at);
}
// Or with computedFn:
getIssueById = computedFn((id: string) => this.issuesMap[id]);

// After (Zustand)
// Option 1: Selector
const activeIssues = useStore((state) =>
  state.issues.filter(i => !i.archived_at)
);

// Option 2: Function in store
getIssueById: (id: string) => {
  return get().issuesMap[id];
},

// Option 3: Pure utility function
export const getActiveIssues = (issues: TIssue[]) =>
  issues.filter(i => !i.archived_at);
```

### Pattern 4: API Calls → TanStack Query

```typescript
// Before (MobX)
@action
async fetchIssues(workspaceSlug: string, projectId: string) {
  runInAction(() => { this.isLoading = true; });
  const issues = await this.issueService.getIssues(workspaceSlug, projectId);
  runInAction(() => {
    this.issues = issues;
    this.isLoading = false;
  });
}

// After (TanStack Query)
const { data: issues, isLoading } = useIssues(workspaceSlug, projectId);
```

### Pattern 5: Mutations → TanStack Query Mutations

```typescript
// Before (MobX)
@action
async updateIssue(issueId: string, data: Partial<TIssue>) {
  const issueBeforeUpdate = this.issuesMap[issueId];
  try {
    runInAction(() => {
      this.issuesMap[issueId] = { ...this.issuesMap[issueId], ...data };
    });
    await this.issueService.patchIssue(workspaceSlug, projectId, issueId, data);
  } catch (error) {
    runInAction(() => {
      this.issuesMap[issueId] = issueBeforeUpdate;
    });
    throw error;
  }
}

// After (TanStack Query)
const { mutate: updateIssue } = useMutation({
  mutationFn: ({ issueId, data }) =>
    issueService.patchIssue(workspaceSlug, projectId, issueId, data),
  onMutate: async ({ issueId, data }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.issues.detail(issueId) });
    const previousIssue = queryClient.getQueryData(queryKeys.issues.detail(issueId));

    if (previousIssue) {
      queryClient.setQueryData(queryKeys.issues.detail(issueId), {
        ...previousIssue,
        ...data,
      });
    }

    return { previousIssue };
  },
  onError: (error, variables, context) => {
    if (context?.previousIssue) {
      queryClient.setQueryData(
        queryKeys.issues.detail(variables.issueId),
        context.previousIssue
      );
    }
  },
  onSettled: (data, error, { issueId }) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId) });
  },
});
```

## Common Pitfalls

### Pitfall 1: Forgetting to Cancel In-Flight Queries

```typescript
// BAD - No query cancellation
onMutate: async ({ issueId, data }) => {
  queryClient.setQueryData(queryKeys.issues.detail(issueId), data);
},

// GOOD - Cancel in-flight queries
onMutate: async ({ issueId, data }) => {
  await queryClient.cancelQueries({ queryKey: queryKeys.issues.detail(issueId) });
  // Now safe to do optimistic update
},
```

### Pitfall 2: Not Handling Loading States

```typescript
// BAD - No loading handling
const issues = useStore((state) => state.issues);
return <div>{issues.map(...)}</div>; // Crashes if undefined

// GOOD - Handle loading explicitly
const { data: issues, isLoading } = useIssues(workspaceSlug, projectId);
if (isLoading) return <Spinner />;
if (!issues) return <EmptyState />;
return <div>{issues.map(...)}</div>;
```

### Pitfall 3: Direct State Mutation

```typescript
// BAD - Direct mutation
set((state) => {
  state.issuesMap[issueId] = issue; // Mutates state directly!
  return state;
});

// GOOD - Immutable update
set((state) => ({
  issuesMap: {
    ...state.issuesMap,
    [issueId]: issue,
  },
}));
```

### Pitfall 4: Using Store Outside React

```typescript
// BAD - Can cause issues with SSR
const issues = useIssueStore.getState().issues;

// GOOD - Use within components
function MyComponent() {
  const issues = useIssueStore((state) => state.issues);
  // ...
}
```

## Performance Considerations

### 1. Selective Subscriptions

```typescript
// BAD - Subscribes to entire store
const store = useIssueStore();

// GOOD - Subscribe to specific slice
const issues = useIssueStore((state) => state.issues);
const addIssue = useIssueStore((state) => state.addIssue);
```

### 2. Memoization

```typescript
// Use useMemo for expensive computations
const sortedIssues = useMemo(() => {
  return issues.sort((a, b) => a.sequence_id - b.sequence_id);
}, [issues]);
```

### 3. Query Stale Times

```typescript
// Configure appropriate stale times
export function useIssues(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.issues.all(workspaceSlug, projectId),
    queryFn: () => issueService.getIssues(workspaceSlug, projectId),
    staleTime: 2 * 60 * 1000, // 2 minutes - issues change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

## Migration Timeline Estimate

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: IssueStore | 2-4 hours | Low |
| Phase 2: BaseIssuesStore | 16-24 hours | High |
| Phase 3: Individual Stores (8 files) | 16-24 hours | Medium |
| Phase 4: Root Store | 4-6 hours | Medium |
| Phase 5: View Stores | 8-12 hours | Low |
| **Total** | **46-70 hours** | **Medium-High** |

## Next Steps

1. ✅ **Complete**: IssueStore migration
2. **Start**: BaseIssuesStore refactor (most critical)
   - Extract pure functions to `issue-utils.ts`
   - Create `useBaseIssuesStore` Zustand store
   - Create `useBaseIssues` custom hook
3. **Then**: Migrate individual stores one by one
4. **Finally**: Clean up MobX dependencies and class wrappers

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Migration Best Practices](./mobx-to-tanstack-query-migration-best-practices.md)
- [Query Keys Structure](../apps/web/core/store/queries/query-keys.ts)

---

**Status**: Phase 1 Complete (IssueStore migrated) | Phase 2 In Progress
**Last Updated**: December 2024
