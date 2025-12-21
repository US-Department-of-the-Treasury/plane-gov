# refactor: Migrate State Management from MobX to TanStack Query + Zustand

**Created:** 2025-12-21
**Type:** Major Architectural Refactor
**Estimated Effort:** 5-7 months
**Risk Level:** High

---

## Overview

Migrate Plane's state management from MobX to a modern, battle-tested stack:

- **TanStack Query** (React Query v5) - Server state (API data, caching, synchronization)
- **Zustand** - Client state (UI state, filters, preferences)

This separation follows the "server state vs client state" paradigm that has become industry standard.

---

## Problem Statement / Motivation

### Why Migrate Away from MobX?

1. **Declining Ecosystem Support**
   - MobX weekly downloads: ~2.3M (flat growth)
   - TanStack Query: ~12.8M (growing)
   - Zustand: ~14.7M (growing rapidly)
   - Fewer new tutorials, blog posts, and community resources

2. **Developer Experience Pain Points**
   - Strict-mode violations require manual `runInAction()` wrapping (534 occurrences in codebase)
   - Class-based patterns feel outdated in hooks era
   - Implicit reactivity makes debugging difficult
   - `computedFn` workarounds for memoization (176 usages)

3. **Architecture Debt**
   - Server state and client state mixed in same stores
   - 30+ stores with complex cross-store dependencies
   - Manual cache invalidation and cleanup
   - 992 components wrapped with `observer()` - tight coupling

4. **Future Risk**
   - React 19+ moves toward Server Components (MobX integration unclear)
   - Next.js/React Router advances favor hooks-based patterns
   - Talent acquisition - new hires more familiar with TanStack Query/Zustand

### Why TanStack Query + Zustand?

| Criteria               | TanStack Query + Zustand                                | Meets Requirement |
| ---------------------- | ------------------------------------------------------- | ----------------- |
| Battle-tested at scale | Coinbase, AWS Console, Microsoft, Vercel                | Yes               |
| Weekly downloads       | 27.5M combined (12x MobX)                               | Yes               |
| High performance       | Automatic request deduplication, selector subscriptions | Yes               |
| Active maintenance     | Both have full-time maintainers, corporate backing      | Yes               |
| React 19+ compatible   | Full support, Server Components ready                   | Yes               |
| Bundle size            | ~17KB combined (same as MobX alone)                     | Yes               |
| Stability              | TanStack Query v5 stable, Zustand v5 stable             | Yes               |

---

## Current State Analysis

### MobX Usage Scale

| Metric                        | Count                 |
| ----------------------------- | --------------------- |
| Store files                   | 136                   |
| Lines of store code           | ~27,500               |
| Components using `observer()` | 992                   |
| Custom store hooks            | 48                    |
| `runInAction` usages          | 534                   |
| `computedFn` usages           | 176                   |
| Files using SWR               | 85 (already present!) |

### Store Architecture

```
CoreRootStore
├── RouterStore
├── UserStore
├── WorkspaceRootStore
├── ProjectRootStore
│   └── ~15 project-related stores
├── IssueRootStore (MOST COMPLEX)
│   ├── IssueStore (25 class extensions!)
│   │   ├── ProjectIssues
│   │   ├── SprintIssues
│   │   ├── ModuleIssues
│   │   ├── WorkspaceIssues
│   │   └── ... 20+ more
│   ├── IssueDetail (~9 sub-stores)
│   ├── IssueFilterStore
│   ├── IssueKanbanStore
│   └── IssueBulkOperationsStore
├── SprintStore
├── ModuleStore
├── LabelStore
├── StateStore
├── MemberStore
├── CommandPaletteStore
├── ThemeStore
└── ~15 more domain stores
```

### Most Complex Areas (Migration Priority)

1. **Issue Domain** - 43 files, 1,954 line base store with 25 extensions
2. **Cross-Store Sync** - Large autorun syncing router state across stores
3. **Sign-Out Cleanup** - 30+ stores re-instantiated manually

---

## Proposed Solution

### Target Architecture

```
/stores/
├── /queries/              # TanStack Query (Server State)
│   ├── issues/
│   │   ├── useIssues.ts
│   │   ├── useIssue.ts
│   │   └── issueKeys.ts   # Query key factory
│   ├── projects/
│   ├── workspaces/
│   ├── sprints/
│   └── modules/
│
├── /mutations/            # TanStack Query Mutations
│   ├── issues/
│   │   ├── useCreateIssue.ts
│   │   ├── useUpdateIssue.ts
│   │   └── useDeleteIssue.ts
│   └── ...
│
└── /client/               # Zustand (Client State)
    ├── useUIStore.ts      # Sidebar, modals, command palette
    ├── useFilterStore.ts  # Issue filters (per-view)
    ├── useThemeStore.ts   # Theme preferences
    ├── useSelectionStore.ts # Multi-select state
    └── useLocalPrefsStore.ts # Persisted user preferences
```

### State Classification

| State Type       | Location        | Examples                                     |
| ---------------- | --------------- | -------------------------------------------- |
| **Server State** | TanStack Query  | Issues, projects, workspaces, users, sprints |
| **Client State** | Zustand         | Theme, sidebar open/closed, selected tab     |
| **URL State**    | React Router    | Filters, current view, pagination            |
| **Form State**   | React Hook Form | Issue creation/edit forms                    |
| **Local State**  | useState        | Component-level toggles                      |

### Query Key Convention

```typescript
// /stores/queries/queryKeys.ts
export const queryKeys = {
  workspaces: {
    all: ["workspaces"] as const,
    detail: (slug: string) => ["workspaces", slug] as const,
  },
  projects: {
    all: (workspaceSlug: string) => ["projects", workspaceSlug] as const,
    detail: (projectId: string) => ["projects", "detail", projectId] as const,
  },
  issues: {
    all: (workspaceSlug: string, projectId: string) => ["issues", workspaceSlug, projectId] as const,
    detail: (issueId: string) => ["issues", "detail", issueId] as const,
    filtered: (workspaceSlug: string, projectId: string, filters: IssueFilters) =>
      ["issues", workspaceSlug, projectId, filters] as const,
    sprint: (sprintId: string) => ["issues", "sprint", sprintId] as const,
    module: (moduleId: string) => ["issues", "module", moduleId] as const,
  },
} as const;
```

---

## Technical Approach

### Phase 1: Foundation (2-3 weeks)

**Goals:**

- Set up infrastructure
- Migrate simplest stores as proof of concept
- Validate coexistence pattern

**Tasks:**

1. **Add dependencies**

   ```bash
   pnpm add @tanstack/react-query zustand
   pnpm add -D @tanstack/react-query-devtools
   ```

2. **Create QueryClient provider**

   ```typescript
   // apps/web/app/providers.tsx
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 60 * 1000, // 1 minute
         gcTime: 10 * 60 * 1000, // 10 minutes
         retry: 2,
         refetchOnWindowFocus: false,
       },
     },
   });
   ```

3. **Migrate ThemeStore (Zustand proof of concept)**
   - Simplest store, no server state, no dependencies
   - Validates Zustand patterns work with codebase

4. **Migrate UserStore (TanStack Query proof of concept)**
   - Simple server state with few dependencies
   - Validates query/mutation patterns

5. **Create coexistence adapter**
   ```typescript
   // Bridge for MobX stores to expose TanStack Query interface
   export function useMobXQuery<T>(mobxFetcher: () => Promise<T>, queryKey: QueryKey) {
     return useQuery({
       queryKey,
       queryFn: mobxFetcher,
     });
   }
   ```

**Deliverables:**

- [ ] QueryClient configured and wrapped around app
- [ ] ThemeStore migrated to Zustand
- [ ] UserStore migrated to TanStack Query
- [ ] Coexistence adapter tested
- [ ] Performance baseline established

### Phase 2: Core Entities (6-8 weeks)

**Goals:**

- Migrate stores in dependency order
- Establish patterns for complex scenarios

**Migration Order (dependencies first):**

| Week | Store             | Complexity | Dependencies   |
| ---- | ----------------- | ---------- | -------------- |
| 1    | StateStore        | Low        | None           |
| 1    | LabelStore        | Low        | None           |
| 2    | MemberStore       | Low        | WorkspaceStore |
| 2    | SprintStore       | Medium     | ProjectStore   |
| 3    | ModuleStore       | Medium     | ProjectStore   |
| 3-4  | ProjectStore      | Medium     | WorkspaceStore |
| 4-5  | WorkspaceStore    | Medium     | UserStore      |
| 6-8  | IssueStore (base) | HIGH       | All above      |

**Pattern for each migration:**

```typescript
// 1. Create query hooks
// stores/queries/issues/useIssues.ts
export function useIssues(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.issues.all(workspaceSlug, projectId),
    queryFn: () => issueService.getIssues(workspaceSlug, projectId),
    staleTime: 30 * 1000,
  });
}

// 2. Create mutation hooks
// stores/mutations/issues/useUpdateIssue.ts
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, data }: UpdateIssueParams) => issueService.updateIssue(issueId, data),
    onMutate: async ({ issueId, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["issues"] });
      const previousIssues = queryClient.getQueryData(["issues"]);
      queryClient.setQueryData(["issues"], (old) =>
        old?.map((issue) => (issue.id === issueId ? { ...issue, ...data } : issue))
      );
      return { previousIssues };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["issues"], context?.previousIssues);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["issues"] });
    },
  });
}

// 3. Update components
function IssueList({ workspaceSlug, projectId }) {
  const { data: issues, isPending, error } = useIssues(workspaceSlug, projectId);
  const updateIssue = useUpdateIssue();

  if (isPending) return <Spinner />;
  if (error) return <Error error={error} />;

  return issues.map((issue) => (
    <IssueCard key={issue.id} issue={issue} onUpdate={(data) => updateIssue.mutate({ issueId: issue.id, data })} />
  ));
}
```

**Deliverables:**

- [ ] All non-issue stores migrated
- [ ] Base IssueStore migrated
- [ ] Cross-store invalidation patterns established
- [ ] 50%+ of observer() components converted

### Phase 3: Complex Stores (4-6 weeks)

**Goals:**

- Migrate issue sub-stores (25 extensions)
- Handle Kanban/grouping/pagination
- Migrate bulk operations

**Key Challenges:**

1. **Kanban Grouping**

   ```typescript
   // Group issues by status, each column can paginate independently
   export function useGroupedIssues(projectId: string, groupBy: string) {
     const { data: issues } = useIssues(projectId);

     return useMemo(() => {
       return issues?.reduce(
         (groups, issue) => {
           const key = issue[groupBy];
           groups[key] = groups[key] || [];
           groups[key].push(issue);
           return groups;
         },
         {} as Record<string, Issue[]>
       );
     }, [issues, groupBy]);
   }
   ```

2. **Infinite Scroll per Group**

   ```typescript
   export function useInfiniteIssues(projectId: string, status: string) {
     return useInfiniteQuery({
       queryKey: ["issues", projectId, status],
       queryFn: ({ pageParam = 0 }) => issueService.getIssues(projectId, { status, offset: pageParam }),
       getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length * 50 : undefined),
     });
   }
   ```

3. **Drag and Drop with Optimistic Updates**

   ```typescript
   export function useMoveIssue() {
     const queryClient = useQueryClient();

     return useMutation({
       mutationFn: ({ issueId, fromStatus, toStatus }) => issueService.updateIssue(issueId, { status: toStatus }),
       onMutate: async ({ issueId, fromStatus, toStatus }) => {
         // Cancel any outgoing refetches
         await queryClient.cancelQueries({ queryKey: ["issues"] });

         // Snapshot for rollback
         const snapshot = {
           from: queryClient.getQueryData(["issues", "status", fromStatus]),
           to: queryClient.getQueryData(["issues", "status", toStatus]),
         };

         // Optimistic update - remove from source, add to target
         queryClient.setQueryData(["issues", "status", fromStatus], (old) => old?.filter((i) => i.id !== issueId));
         queryClient.setQueryData(["issues", "status", toStatus], (old) => [
           ...(old || []),
           { ...issueById, status: toStatus },
         ]);

         return { snapshot };
       },
       onError: (err, variables, context) => {
         // Rollback both columns
         queryClient.setQueryData(["issues", "status", variables.fromStatus], context?.snapshot.from);
         queryClient.setQueryData(["issues", "status", variables.toStatus], context?.snapshot.to);
       },
     });
   }
   ```

**Deliverables:**

- [ ] All 25 issue store extensions migrated
- [ ] Kanban view working with TanStack Query
- [ ] Drag-and-drop with proper optimistic updates
- [ ] Bulk operations migrated
- [ ] 80%+ of observer() components converted

### Phase 4: Cleanup & Optimization (2-3 weeks)

**Goals:**

- Remove MobX dependencies
- Optimize bundle size
- Update documentation

**Tasks:**

1. **Remove MobX**

   ```bash
   pnpm remove mobx mobx-react mobx-react-lite mobx-utils
   ```

2. **Remove all observer() wrappers**

   ```typescript
   // Before
   export const IssueCard = observer(function IssueCard(props) { ... })

   // After
   export function IssueCard(props) { ... }
   ```

3. **Remove RootStore infrastructure**
   - Delete `/stores/root.store.ts`
   - Delete `/stores/*/index.ts` MobX stores
   - Remove StoreContext

4. **Bundle optimization**
   - Verify bundle size decreased
   - Add React Query DevTools (dev only)
   - Code split query/mutation files if needed

5. **Documentation**
   - Update CONTRIBUTING.md with new patterns
   - Create state management guide
   - Update component examples

**Deliverables:**

- [ ] MobX completely removed
- [ ] Bundle size same or smaller than before
- [ ] All tests passing
- [ ] Documentation updated

---

## Acceptance Criteria

### Functional Requirements

- [ ] All current features work identically after migration
- [ ] Optimistic updates work for drag-and-drop operations
- [ ] Filters persist correctly (URL + localStorage)
- [ ] Sign-out clears all state (no data leaks)
- [ ] Deep links work (issue permalinks load correctly)

### Non-Functional Requirements

- [ ] No performance regression (measure Core Web Vitals)
- [ ] Bundle size: same or smaller than current
- [ ] Memory usage: same or lower (no dual-caching)
- [ ] Network requests: same or fewer (better caching)

### Quality Gates

- [ ] 80%+ test coverage on new query/mutation hooks
- [ ] All existing E2E tests passing
- [ ] Code review approval from 2+ team members
- [ ] Performance audit passed

---

## Risk Analysis & Mitigation

### HIGH RISK

| Risk                               | Impact                      | Probability | Mitigation                                |
| ---------------------------------- | --------------------------- | ----------- | ----------------------------------------- |
| Optimistic update race conditions  | Data corruption             | Medium      | Mutation queue, disable UI during pending |
| Cache invalidation bugs            | Stale data shown to users   | High        | Invalidation map, comprehensive testing   |
| Performance regression on bulk ops | Slow bulk archive/update    | Medium      | Batch cache updates, test with 100+ items |
| Migration timeline overrun         | Incomplete state, tech debt | Medium      | Feature flags, incremental rollout        |

### MEDIUM RISK

| Risk                            | Impact                | Probability | Mitigation                             |
| ------------------------------- | --------------------- | ----------- | -------------------------------------- |
| Filter state desync             | Wrong data displayed  | Medium      | Single source of truth (URL)           |
| Developer confusion             | Bugs during migration | High        | Clear documentation, pair programming  |
| Memory leaks during coexistence | High memory usage     | Low         | Clear MobX cache for migrated entities |

### Rollback Strategy

1. **Feature Flags** (Recommended)

   ```typescript
   const USE_TANSTACK = process.env.NEXT_PUBLIC_USE_TANSTACK === "true";
   ```

   - Instant rollback via environment variable
   - Can roll back individual features

2. **Incremental Rollback**
   - Revert individual PRs
   - MobX stores kept until full migration complete

3. **Full Rollback** (Nuclear)
   - `git revert` all migration PRs
   - Re-add MobX dependencies
   - Only if coexistence broken

---

## Success Metrics

| Metric                  | Current       | Target            | How to Measure                        |
| ----------------------- | ------------- | ----------------- | ------------------------------------- |
| Bundle size             | ~250KB (gzip) | <= 250KB          | bundlephobia, webpack-bundle-analyzer |
| Time to Interactive     | TBD           | No regression     | Lighthouse CI                         |
| Memory usage            | TBD           | No increase       | Chrome DevTools                       |
| MobX strict-mode errors | ~10/session   | 0                 | Browser console                       |
| Developer satisfaction  | N/A           | Positive feedback | Team survey                           |

---

## Dependencies & Prerequisites

### Technical Prerequisites

- [ ] SWR usage audit (85 files) - decide: keep SWR or migrate to TanStack Query
- [ ] TypeScript strict mode for new stores
- [ ] React 18+ (confirmed)
- [ ] React Router v7 (confirmed)

### Team Prerequisites

- [ ] Team training on TanStack Query patterns
- [ ] Team training on Zustand patterns
- [ ] Agree on query key convention
- [ ] Agree on file/folder structure

### Blockers

- Active development on issue stores during migration may cause conflicts
- Consider feature freeze on state management during critical phases

---

## Critical Decisions Needed

Before starting migration, the team must decide:

### 1. Query Key Structure

**Option A: Flat**

```typescript
["issues", workspaceSlug, projectId, filters];
```

**Option B: Nested**

```typescript
["workspaces", slug, "projects", projectId, "issues", filters];
```

**Recommendation:** Option A (simpler invalidation patterns)

### 2. SWR vs TanStack Query

**Current:** SWR 2.2.4 already in 85 files

**Options:**

- A: Migrate SWR files to TanStack Query (consistency)
- B: Keep SWR for simple fetches, TanStack Query for complex (smaller migration)

**Recommendation:** Option A (one caching layer, better DevTools)

### 3. Filter State Location

**Options:**

- A: URL is source of truth, Zustand caches
- B: Zustand is source of truth, syncs to URL
- C: TanStack Query keys contain filters

**Recommendation:** Option A (deep links work, back button works)

### 4. Optimistic Update Failure UX

**Options:**

- A: Silent rollback + error toast
- B: Keep failed state visible + retry button
- C: Block UI until confirmed

**Recommendation:** Option A for simple updates, B for bulk operations

---

## References & Research

### Internal References

- Root store architecture: `apps/web/core/store/root.store.ts`
- Issue store (most complex): `apps/web/core/store/issue/root.store.ts`
- Issue base store: `apps/web/core/store/issue/issue/base-issues.store.ts`
- SWR usage example: `apps/web/core/hooks/use-workspace.tsx`

### External References

- TanStack Query docs: https://tanstack.com/query/latest
- Zustand docs: https://zustand.docs.pmnd.rs/
- TkDodo's Practical React Query: https://tkdodo.eu/blog/practical-react-query
- Zustand comparison guide: https://zustand.docs.pmnd.rs/getting-started/comparison

### Production Usage (Battle-tested)

**TanStack Query:**

- Coinbase (crypto platform, high-frequency updates)
- AWS Console (massive scale)
- Microsoft products
- Lyft, T-Mobile

**Zustand:**

- Vercel (Next.js ecosystem)
- Poimandres projects (Three.js ecosystem)
- 14.7M weekly downloads

---

## Appendix: Code Examples

### Before (MobX)

```typescript
// stores/issue/issue.store.ts
class IssueStore {
  issues: Record<string, Issue> = {};
  loading = false;

  constructor(private rootStore: RootStore) {
    makeObservable(this, {
      issues: observable,
      loading: observable,
      fetchIssues: action,
      updateIssue: action,
      issueCount: computed,
    });
  }

  get issueCount() {
    return Object.keys(this.issues).length;
  }

  async fetchIssues(projectId: string) {
    this.loading = true;
    try {
      const issues = await issueService.getIssues(projectId);
      runInAction(() => {
        issues.forEach((issue) => {
          this.issues[issue.id] = issue;
        });
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async updateIssue(issueId: string, data: Partial<Issue>) {
    const previous = this.issues[issueId];
    // Optimistic update
    runInAction(() => {
      this.issues[issueId] = { ...previous, ...data };
    });
    try {
      await issueService.updateIssue(issueId, data);
    } catch (error) {
      // Rollback
      runInAction(() => {
        this.issues[issueId] = previous;
      });
      throw error;
    }
  }
}

// Component usage
const IssueList = observer(function IssueList({ projectId }) {
  const { issueStore } = useStore();

  useEffect(() => {
    issueStore.fetchIssues(projectId);
  }, [projectId]);

  if (issueStore.loading) return <Spinner />;

  return Object.values(issueStore.issues).map((issue) => <IssueCard key={issue.id} issue={issue} />);
});
```

### After (TanStack Query + Zustand)

```typescript
// stores/queries/issues/useIssues.ts
export function useIssues(projectId: string) {
  return useQuery({
    queryKey: queryKeys.issues.all(projectId),
    queryFn: () => issueService.getIssues(projectId),
    staleTime: 30 * 1000,
  });
}

// stores/mutations/issues/useUpdateIssue.ts
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: Partial<Issue> }) =>
      issueService.updateIssue(issueId, data),
    onMutate: async ({ issueId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issues.all() });
      const previous = queryClient.getQueryData(queryKeys.issues.all());

      queryClient.setQueryData(queryKeys.issues.all(), (old: Issue[] | undefined) =>
        old?.map((issue) => (issue.id === issueId ? { ...issue, ...data } : issue))
      );

      return { previous };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(queryKeys.issues.all(), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all() });
    },
  });
}

// stores/client/useIssueUIStore.ts (Zustand for client state)
export const useIssueUIStore = create<IssueUIStore>((set) => ({
  selectedIssueIds: [],
  selectIssue: (id) =>
    set((s) => ({
      selectedIssueIds: [...s.selectedIssueIds, id],
    })),
  clearSelection: () => set({ selectedIssueIds: [] }),
}));

// Component usage
function IssueList({ projectId }: { projectId: string }) {
  const { data: issues, isPending, error } = useIssues(projectId);
  const updateIssue = useUpdateIssue();
  const selectedIds = useIssueUIStore((s) => s.selectedIssueIds);

  if (isPending) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;

  return issues.map((issue) => (
    <IssueCard
      key={issue.id}
      issue={issue}
      selected={selectedIds.includes(issue.id)}
      onUpdate={(data) => updateIssue.mutate({ issueId: issue.id, data })}
    />
  ));
}
```

---

## Timeline Summary

| Phase                   | Duration        | Key Deliverables                               |
| ----------------------- | --------------- | ---------------------------------------------- |
| Phase 1: Foundation     | 2-3 weeks       | Infrastructure, ThemeStore, UserStore migrated |
| Phase 2: Core Entities  | 6-8 weeks       | All non-issue stores, base IssueStore          |
| Phase 3: Complex Stores | 4-6 weeks       | Issue sub-stores, Kanban, bulk operations      |
| Phase 4: Cleanup        | 2-3 weeks       | Remove MobX, optimize, document                |
| **Total**               | **14-20 weeks** | **Full migration complete**                    |

---

## Next Steps

1. **Immediate**: Team review of this plan, decide on critical decisions (query keys, SWR fate, filter location)
2. **Week 1**: Set up infrastructure, establish performance baseline
3. **Week 2-3**: Migrate ThemeStore and UserStore as proof of concept
4. **Week 4+**: Begin core entity migration if PoC successful
