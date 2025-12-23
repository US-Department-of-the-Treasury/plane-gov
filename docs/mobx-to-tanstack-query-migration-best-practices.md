# MobX to TanStack Query + Zustand Migration Best Practices

## Executive Summary

This document provides comprehensive guidance for migrating from MobX to TanStack Query + Zustand based on research of industry best practices and lessons learned from the Plane Treasury fork's successful large-scale migration (Phase 4: 800+ components migrated).

**Key Insight:** This migration separates concerns - TanStack Query handles server state (data fetching, caching, synchronization), while Zustand handles client state (UI state, local preferences). MobX attempted to handle both, leading to complexity.

---

## Table of Contents

1. [Common Pitfalls When Removing MobX](#common-pitfalls)
2. [Transitioning from Observables to Hooks](#observables-to-hooks)
3. [Testing Strategies During Migration](#testing-strategies)
4. [Incremental Migration Approaches](#incremental-migration)
5. [Performance Considerations](#performance)
6. [Maintaining Feature Parity](#feature-parity)
7. [Real-World Patterns from Plane Migration](#real-world-patterns)

---

## Common Pitfalls When Removing MobX

### Pitfall 1: Forgetting to Remove `observer()` Wrappers

**Problem:** After migrating to TanStack Query hooks, leaving `observer()` wrappers causes unnecessary re-renders and can mask issues.

```tsx
// BAD - observer() no longer needed with TanStack Query
export const EpicList = observer(() => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);
  return <div>{epics?.map(...)}</div>;
});

// GOOD - Remove observer, let React handle re-renders
export const EpicList = () => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);
  return <div>{epics?.map(...)}</div>;
};
```

**Solution:** After migrating components, remove all `observer()` wrappers. TanStack Query triggers re-renders through standard React state updates.

---

### Pitfall 2: Not Canceling In-Flight Queries During Optimistic Updates

**Problem:** Race conditions where old query responses overwrite optimistic updates.

```tsx
// BAD - No query cancellation
export function useUpdateEpic() {
  return useMutation({
    onMutate: ({ workspaceSlug, projectId, epicId, data }) => {
      // Optimistic update
      queryClient.setQueryData(queryKeys.epics.all(workspaceSlug, projectId), ...);
      // Missing: Cancel in-flight queries!
    },
  });
}

// GOOD - Cancel queries before optimistic update
export function useUpdateEpic() {
  return useMutation({
    onMutate: async ({ workspaceSlug, projectId, epicId, data }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.epics.all(workspaceSlug, projectId)
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.epics.detail(epicId)
      });

      // Now safe to do optimistic update
      const previousEpics = queryClient.getQueryData(...);
      queryClient.setQueryData(...);
      return { previousEpics }; // Return context for rollback
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousEpics) {
        queryClient.setQueryData(..., context.previousEpics);
      }
    },
  });
}
```

---

### Pitfall 3: Incorrect Query Key Structure

**Problem:** Query keys that don't properly represent data dependencies lead to stale data or unnecessary refetches.

```tsx
// BAD - Flat query keys lose dependency relationships
const queryKeys = {
  epics: ["epics"],
  epicDetail: (id: string) => ["epic", id],
};

// GOOD - Hierarchical query keys with clear dependencies
const queryKeys = {
  epics: {
    all: (workspaceSlug: string, projectId: string) =>
      ["workspaces", workspaceSlug, "projects", projectId, "epics"] as const,
    detail: (epicId: string) =>
      ["epics", epicId] as const,
    archived: (workspaceSlug: string, projectId: string) =>
      [...queryKeys.epics.all(workspaceSlug, projectId), "archived"] as const,
  },
};

// Enables powerful invalidation patterns:
// Invalidate all project epics
queryClient.invalidateQueries({
  queryKey: ["workspaces", workspaceSlug, "projects", projectId]
});
```

**Best Practice:** Use hierarchical query keys that mirror your data relationships. This enables partial invalidation and better cache management.

---

### Pitfall 4: Mixing Client State with Server State

**Problem:** Using TanStack Query for UI state that should be in Zustand (or vice versa).

```tsx
// BAD - Using TanStack Query for UI state
const { data: sidebarOpen } = useQuery({
  queryKey: ["ui", "sidebar"],
  queryFn: () => true,
  staleTime: Infinity,
});

// GOOD - Use Zustand for UI state
const useUIStore = create((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
}));

// GOOD - Use TanStack Query for server state
const { data: epics } = useQuery({
  queryKey: queryKeys.epics.all(workspaceSlug, projectId),
  queryFn: () => epicService.getEpics(workspaceSlug, projectId),
});
```

**Rule of Thumb:**
- **TanStack Query:** Server state (API data, caching, synchronization)
- **Zustand:** Client state (UI toggles, form drafts, local preferences)
- **React State:** Ephemeral component state (input values, hover states)

---

### Pitfall 5: Not Handling Loading and Error States

**Problem:** MobX stores often had implicit loading states. TanStack Query makes them explicit, and forgetting to handle them breaks UX.

```tsx
// BAD - No loading or error handling
const EpicList = () => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);
  return <div>{epics.map(...)}</div>; // Crashes if epics is undefined
};

// GOOD - Explicit loading and error handling
const EpicList = () => {
  const { data: epics, isLoading, isError, error } = useProjectEpics(workspaceSlug, projectId);

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage error={error} />;
  if (!epics) return <EmptyState />;

  return <div>{epics.map(...)}</div>;
};

// BETTER - Use React Suspense boundaries (requires suspense: true in query)
const EpicList = () => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);
  // Suspense boundary handles loading state
  return <div>{epics.map(...)}</div>;
};
```

---

## Transitioning from Observables to Hooks

### Pattern 1: Replace Computed Values with Query Selectors

**MobX Pattern:**
```tsx
class EpicStore {
  @observable epics = [];

  @computed get activeEpics() {
    return this.epics.filter(e => !e.archived_at);
  }

  @computed get favoriteEpics() {
    return this.epics.filter(e => e.is_favorite);
  }
}
```

**TanStack Query Pattern:**
```tsx
// Define the query
export function useProjectEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    staleTime: 5 * 60 * 1000,
  });
}

// Use selectors for computed values
export function useActiveEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    select: (epics) => epics.filter(e => !e.archived_at),
    staleTime: 5 * 60 * 1000,
  });
}

// Or use utility functions
export const getActiveEpics = (epics: IEpic[] | undefined) =>
  epics?.filter(e => !e.archived_at) ?? [];

export const getFavoriteEpics = (epics: IEpic[] | undefined) =>
  epics?.filter(e => e.is_favorite) ?? [];

// Usage
const { data: epics } = useProjectEpics(workspaceSlug, projectId);
const activeEpics = getActiveEpics(epics);
const favoriteEpics = getFavoriteEpics(epics);
```

**Key Difference:** TanStack Query `select` creates a separate subscription. Use it for expensive computations. For simple filtering, use utility functions (more explicit, easier to test).

---

### Pattern 2: Replace Actions with Mutations

**MobX Pattern:**
```tsx
class EpicStore {
  @action
  async updateEpic(workspaceSlug: string, projectId: string, epicId: string, data: Partial<IEpic>) {
    try {
      this.isUpdating = true;
      const response = await epicService.updateEpic(workspaceSlug, projectId, epicId, data);
      runInAction(() => {
        const index = this.epics.findIndex(e => e.id === epicId);
        if (index !== -1) {
          this.epics[index] = response;
        }
      });
    } catch (error) {
      runInAction(() => {
        this.error = error;
      });
    } finally {
      runInAction(() => {
        this.isUpdating = false;
      });
    }
  }
}
```

**TanStack Query Pattern:**
```tsx
export interface UpdateEpicParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  data: Partial<IEpic>;
}

export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId, data }: UpdateEpicParams) =>
      epicService.patchEpic(workspaceSlug, projectId, epicId, data),

    // Optimistic update (instant UI feedback)
    onMutate: async ({ workspaceSlug, projectId, epicId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(
        queryKeys.epics.all(workspaceSlug, projectId)
      );

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((epic) =>
            epic.id === epicId ? { ...epic, ...data } : epic
          )
        );
      }

      return { previousEpics, workspaceSlug, projectId };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousEpics) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },

    // Sync with server after mutation completes
    onSettled: (data, error, { workspaceSlug, projectId, epicId }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.epics.all(workspaceSlug, projectId)
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.epics.detail(epicId)
      });
    },
  });
}

// Usage
const { mutate: updateEpic, isPending, isError, error } = useUpdateEpic();

const handleUpdate = () => {
  updateEpic(
    { workspaceSlug, projectId, epicId, data: { name: "New Name" } },
    {
      onSuccess: () => toast.success("Epic updated"),
      onError: (error) => toast.error(error.message),
    }
  );
};
```

**Benefits:**
- Loading state (`isPending`) is automatic
- Error handling is explicit
- Optimistic updates provide instant feedback
- Automatic rollback on errors
- Cache invalidation ensures consistency

---

### Pattern 3: Replace Reactions with Query Effects

**MobX Pattern:**
```tsx
class EpicStore {
  constructor() {
    // React to changes
    reaction(
      () => this.selectedEpicId,
      (epicId) => {
        if (epicId) {
          this.fetchEpicDetails(epicId);
        }
      }
    );
  }
}
```

**TanStack Query Pattern:**
```tsx
// Queries are reactive by default - they run when dependencies change
const EpicDetail = ({ epicId }: { epicId: string }) => {
  const { data: epic } = useEpicDetails(workspaceSlug, projectId, epicId);
  // Automatically refetches when epicId changes

  return <div>{epic?.name}</div>;
};

// For side effects, use React's useEffect
const EpicDetail = ({ epicId }: { epicId: string }) => {
  const { data: epic } = useEpicDetails(workspaceSlug, projectId, epicId);

  useEffect(() => {
    if (epic) {
      // Side effect: track analytics
      analytics.track("Epic Viewed", { epicId: epic.id });
    }
  }, [epic]);

  return <div>{epic?.name}</div>;
};
```

**Key Difference:** TanStack Query hooks are already reactive - they refetch when query keys change. Use `useEffect` for side effects, not for data fetching.

---

## Testing Strategies During Migration

### Strategy 1: Test Both Old and New Implementations Side-by-Side

During incremental migration, test that TanStack Query hooks return the same data as MobX stores:

```tsx
// test/utils/migration-testing.ts
export function assertDataParity<T>(
  mobxData: T,
  tanstackData: T,
  testName: string
) {
  if (JSON.stringify(mobxData) !== JSON.stringify(tanstackData)) {
    console.error(`Data mismatch in ${testName}:`, {
      mobx: mobxData,
      tanstack: tanstackData,
    });
    throw new Error(`Data parity check failed for ${testName}`);
  }
}

// Usage in component during migration
const mobxStore = useEpicStore(); // Old
const { data: tanstackEpics } = useProjectEpics(workspaceSlug, projectId); // New

if (process.env.NODE_ENV === "development") {
  useEffect(() => {
    if (mobxStore.epics && tanstackEpics) {
      assertDataParity(mobxStore.epics, tanstackEpics, "ProjectEpics");
    }
  }, [mobxStore.epics, tanstackEpics]);
}
```

---

### Strategy 2: Mock TanStack Query in Tests

```tsx
// test/utils/test-utils.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });
}

export function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// In tests
import { renderHook, waitFor } from "@testing-library/react";

test("useProjectEpics fetches epics", async () => {
  const { result } = renderHook(
    () => useProjectEpics("workspace-1", "project-1"),
    { wrapper }
  );

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toEqual([
    { id: "1", name: "Epic 1" },
    { id: "2", name: "Epic 2" },
  ]);
});
```

---

### Strategy 3: Use Mock Service Worker (MSW) for API Mocking

```tsx
// test/mocks/handlers.ts
import { rest } from "msw";

export const handlers = [
  rest.get("/api/workspaces/:workspaceSlug/projects/:projectId/epics", (req, res, ctx) => {
    return res(
      ctx.json([
        { id: "1", name: "Epic 1", status: "active" },
        { id: "2", name: "Epic 2", status: "completed" },
      ])
    );
  }),

  rest.patch("/api/workspaces/:workspaceSlug/projects/:projectId/epics/:epicId", (req, res, ctx) => {
    return res(ctx.json({ ...req.body, id: req.params.epicId }));
  }),
];

// test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// test/setup.ts
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

### Strategy 4: Write E2E Tests with Playwright

```typescript
// e2e/epic-management.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Epic Management", () => {
  test("creates and updates epic", async ({ page }) => {
    await page.goto("/workspaces/ws-1/projects/proj-1/epics");

    // Create epic
    await page.click('button:has-text("New Epic")');
    await page.fill('input[name="name"]', "Q1 Launch");
    await page.click('button:has-text("Create")');

    // Verify epic appears in list
    await expect(page.locator('text="Q1 Launch"')).toBeVisible();

    // Update epic
    await page.click('text="Q1 Launch"');
    await page.fill('input[name="name"]', "Q1 Product Launch");
    await page.click('button:has-text("Save")');

    // Verify update
    await expect(page.locator('text="Q1 Product Launch"')).toBeVisible();
  });

  test("handles network errors gracefully", async ({ page, context }) => {
    // Simulate network failure
    await context.route("**/api/workspaces/**/epics", (route) =>
      route.abort()
    );

    await page.goto("/workspaces/ws-1/projects/proj-1/epics");

    // Should show error state
    await expect(page.locator('text="Failed to load epics"')).toBeVisible();
  });
});
```

**Lesson from Plane Migration:** E2E tests caught critical issues during migration that unit tests missed, particularly around cache invalidation and race conditions.

---

## Incremental Migration Approaches

### Approach 1: Feature Flags for Gradual Rollout

```tsx
// config/features.ts
export const features = {
  useTanStackQueryEpics: process.env.NEXT_PUBLIC_USE_TANSTACK_EPICS === "true",
};

// components/epic-list.tsx
const EpicList = () => {
  if (features.useTanStackQueryEpics) {
    // New TanStack Query implementation
    const { data: epics } = useProjectEpics(workspaceSlug, projectId);
    return <EpicListView epics={epics} />;
  } else {
    // Old MobX implementation
    const epicStore = useEpicStore();
    return <EpicListView epics={epicStore.epics} />;
  }
};
```

---

### Approach 2: Backward-Compatible Wrapper Hooks

**Strategy:** Create wrapper hooks that match the old MobX API but use TanStack Query internally.

```tsx
/**
 * Backward-compatible hook that wraps TanStack Query.
 * Matches the old MobX EpicStore API.
 *
 * @deprecated Use useProjectEpics() and useUpdateEpic() directly
 */
export function useEpic() {
  const createEpic = useCreateEpic();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();

  return {
    // Old MobX-style API
    createEpicDetails: (workspaceSlug: string, projectId: string, data: any) =>
      createEpic.mutateAsync({ workspaceSlug, projectId, data }),

    updateEpicDetails: (workspaceSlug: string, projectId: string, epicId: string, data: any) =>
      updateEpic.mutateAsync({ workspaceSlug, projectId, epicId, data }),

    // Expose TanStack Query hooks for new code
    useProjectEpics,
    useEpicDetails,
  };
}
```

**Benefits:**
- Minimal changes to existing components
- Can migrate gradually without breaking functionality
- Clear migration path (deprecation warnings guide developers)

---

### Approach 3: Phased Migration by Domain

**Lesson from Plane:** Migrate entire domains (epics, sprints, projects) rather than individual components.

```
Phase 1: Foundation
- Set up TanStack Query provider
- Create query keys structure
- Implement first domain (e.g., epics)

Phase 2: Core Domains
- Projects
- Issues
- Sprints
- Labels

Phase 3: Secondary Features
- Comments
- Attachments
- Notifications
- Analytics

Phase 4: Cleanup
- Remove observer() wrappers
- Delete MobX stores
- Update tests
- Remove feature flags
```

**Why Domain-First Works:**
- Maintains feature completeness
- Easier to test entire workflows
- Clear progress tracking
- Reduces context switching

---

## Performance Considerations

### Optimization 1: Configure Appropriate Stale Times

```tsx
// BAD - Refetches too aggressively (default staleTime: 0)
export function useProjectEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    // Missing staleTime - refetches on every window focus!
  });
}

// GOOD - Appropriate stale time for data that changes infrequently
export function useProjectEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes - epics don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
  });
}

// BETTER - Real-time data with appropriate refetch settings
export function useIssueDetails(workspaceSlug: string, projectId: string, issueId: string) {
  return useQuery({
    queryKey: queryKeys.issues.detail(issueId),
    queryFn: () => issueService.getIssueDetails(workspaceSlug, projectId, issueId),
    staleTime: 30 * 1000, // 30 seconds - issues change more frequently
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}
```

**Guidelines:**
- Static data (projects, epics): `staleTime: 5-10 minutes`
- Frequently updated (issues, comments): `staleTime: 30 seconds - 1 minute`
- Real-time critical (notifications): `staleTime: 0`, use polling or WebSockets
- User-specific (profile, settings): `staleTime: Infinity` + manual invalidation

---

### Optimization 2: Use `select` for Expensive Transformations

```tsx
// BAD - Transforms data in component (runs on every render)
const EpicList = () => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);

  // This sorting runs on EVERY render, even if epics haven't changed
  const sortedEpics = epics?.sort((a, b) => a.sort_order - b.sort_order);

  return <div>{sortedEpics?.map(...)}</div>;
};

// GOOD - Transform in select (only runs when data changes)
const EpicList = () => {
  const { data: sortedEpics } = useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    select: (epics) => epics.sort((a, b) => a.sort_order - b.sort_order),
    staleTime: 5 * 60 * 1000,
  });

  return <div>{sortedEpics?.map(...)}</div>;
};

// BETTER - Memoize in component if transformation depends on props
const EpicList = ({ sortBy }: { sortBy: "sort_order" | "name" }) => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);

  const sortedEpics = useMemo(() => {
    if (!epics) return [];
    return [...epics].sort((a, b) => {
      if (sortBy === "sort_order") return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
  }, [epics, sortBy]);

  return <div>{sortedEpics.map(...)}</div>;
};
```

---

### Optimization 3: Prefetch Data for Better UX

```tsx
// Prefetch epic details when hovering over epic list item
const EpicListItem = ({ epic }: { epic: IEpic }) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.epics.detail(epic.id),
      queryFn: () => epicService.getEpicDetails(workspaceSlug, projectId, epic.id),
      staleTime: 5 * 60 * 1000,
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Link href={`/epics/${epic.id}`}>{epic.name}</Link>
    </div>
  );
};

// Prefetch next page in infinite list
const EpicInfiniteList = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: ({ pageParam = 0 }) =>
      epicService.getEpics(workspaceSlug, projectId, { page: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
  });

  // Prefetch next page when user scrolls to 80%
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      const handleScroll = () => {
        const scrollPercentage =
          (window.scrollY + window.innerHeight) / document.body.scrollHeight;
        if (scrollPercentage > 0.8) {
          void fetchNextPage();
        }
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return <div>{data?.pages.map(...)}</div>;
};
```

---

### Optimization 4: Avoid Over-Invalidation

```tsx
// BAD - Invalidates too broadly
const { mutate: updateEpic } = useMutation({
  mutationFn: updateEpicFn,
  onSuccess: () => {
    // Invalidates ALL queries! Even unrelated ones!
    void queryClient.invalidateQueries();
  },
});

// BETTER - Invalidate specific queries
const { mutate: updateEpic } = useMutation({
  mutationFn: updateEpicFn,
  onSuccess: (data, { workspaceSlug, projectId, epicId }) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.epics.all(workspaceSlug, projectId)
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.epics.detail(epicId)
    });
  },
});

// BEST - Optimistic update + targeted invalidation
const { mutate: updateEpic } = useMutation({
  mutationFn: updateEpicFn,
  onMutate: async ({ workspaceSlug, projectId, epicId, data }) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({
      queryKey: queryKeys.epics.all(workspaceSlug, projectId)
    });

    // Optimistic update (instant UI feedback)
    const previousEpics = queryClient.getQueryData<IEpic[]>(
      queryKeys.epics.all(workspaceSlug, projectId)
    );

    if (previousEpics) {
      queryClient.setQueryData<IEpic[]>(
        queryKeys.epics.all(workspaceSlug, projectId),
        previousEpics.map((e) => (e.id === epicId ? { ...e, ...data } : e))
      );
    }

    return { previousEpics };
  },
  onError: (error, variables, context) => {
    // Rollback on error
    if (context?.previousEpics) {
      queryClient.setQueryData(
        queryKeys.epics.all(workspaceSlug, projectId),
        context.previousEpics
      );
    }
  },
  onSettled: (data, error, { workspaceSlug, projectId, epicId }) => {
    // Only invalidate affected queries after server confirms
    void queryClient.invalidateQueries({
      queryKey: queryKeys.epics.all(workspaceSlug, projectId)
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.epics.detail(epicId)
    });
  },
});
```

---

## Maintaining Feature Parity

### Strategy 1: Create a Feature Parity Checklist

Before marking a migration complete, verify:

```markdown
## Feature Parity Checklist

### Data Fetching
- [ ] All list views show correct data
- [ ] Detail views show complete data
- [ ] Filters work correctly
- [ ] Sorting works correctly
- [ ] Search works correctly
- [ ] Pagination/infinite scroll works

### Mutations
- [ ] Create operations work
- [ ] Update operations work
- [ ] Delete operations work
- [ ] Bulk operations work
- [ ] Optimistic updates feel instant
- [ ] Error states are handled

### Real-Time Updates
- [ ] Changes from other users appear (WebSocket integration)
- [ ] Stale data is refetched appropriately
- [ ] Background refetching works
- [ ] Focus refetching works

### Edge Cases
- [ ] Works offline (graceful degradation)
- [ ] Handles network errors
- [ ] Handles auth errors
- [ ] Handles concurrent updates (race conditions)
- [ ] Handles empty states
- [ ] Handles large datasets

### Performance
- [ ] No unnecessary refetches
- [ ] Loading states are smooth
- [ ] No layout shifts
- [ ] Cache is utilized effectively
```

---

### Strategy 2: Implement Error Boundaries

```tsx
// components/error-boundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-state">
            <h2>Something went wrong</h2>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage with TanStack Query
const App = () => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        fallback={<ErrorFallback onReset={reset} />}
      >
        <EpicList />
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
```

---

### Strategy 3: Document Migration Patterns

Create a migration guide for your team:

```markdown
## Epic Migration Guide

### Before (MobX)
```tsx
const EpicList = observer(() => {
  const epicStore = useEpic();

  useEffect(() => {
    epicStore.fetchEpics(workspaceSlug, projectId);
  }, [workspaceSlug, projectId]);

  return <div>{epicStore.epics.map(...)}</div>;
});
```

### After (TanStack Query)
```tsx
const EpicList = () => {
  const { data: epics, isLoading } = useProjectEpics(workspaceSlug, projectId);

  if (isLoading) return <Spinner />;

  return <div>{epics?.map(...)}</div>;
};
```

### Key Changes
1. Remove `observer()` wrapper
2. Remove `useEffect` for data fetching
3. Use `useProjectEpics()` hook instead of store
4. Handle loading states explicitly
5. Data is automatically refetched when params change
```

---

## Real-World Patterns from Plane Migration

### Pattern 1: Centralized Query Keys

**File: `apps/web/core/store/queries/query-keys.ts`**

```typescript
export const queryKeys = {
  workspaces: {
    all: ["workspaces"] as const,
    detail: (workspaceSlug: string) => ["workspaces", workspaceSlug] as const,
  },
  projects: {
    all: (workspaceSlug: string) =>
      ["workspaces", workspaceSlug, "projects"] as const,
    lite: (workspaceSlug: string) =>
      [...queryKeys.projects.all(workspaceSlug), "lite"] as const,
    detail: (projectId: string) =>
      ["projects", projectId] as const,
  },
  epics: {
    all: (workspaceSlug: string, projectId: string) =>
      ["workspaces", workspaceSlug, "projects", projectId, "epics"] as const,
    detail: (epicId: string) =>
      ["epics", epicId] as const,
    archived: (workspaceSlug: string, projectId: string) =>
      [...queryKeys.epics.all(workspaceSlug, projectId), "archived"] as const,
  },
  issues: {
    all: (workspaceSlug: string, projectId: string) =>
      ["workspaces", workspaceSlug, "projects", projectId, "issues"] as const,
    detail: (issueId: string) =>
      ["issues", issueId] as const,
    comments: (issueId: string) =>
      [...queryKeys.issues.detail(issueId), "comments"] as const,
  },
};
```

**Benefits:**
- Type-safe query keys
- Easy to invalidate hierarchically
- Single source of truth
- IDE autocomplete

---

### Pattern 2: Utility Functions for Data Access

**File: `apps/web/core/store/queries/epic.ts`**

```typescript
/**
 * Utility function to get epic by ID from query cache.
 * Works with any epics array (doesn't require React context).
 */
export const getEpicById = (
  epics: IEpic[] | undefined,
  epicId: string | null | undefined
): IEpic | undefined => {
  if (!epics || !epicId) return undefined;
  return epics.find((epic) => epic.id === epicId);
};

/**
 * Get epic name by ID (useful for labels, breadcrumbs).
 */
export const getEpicNameById = (
  epics: IEpic[] | undefined,
  epicId: string | null | undefined
): string => {
  return getEpicById(epics, epicId)?.name ?? "Unknown Epic";
};

/**
 * Get all active (non-archived) epics.
 */
export const getActiveEpics = (epics: IEpic[] | undefined): IEpic[] => {
  return epics?.filter((epic) => !epic.archived_at) ?? [];
};

/**
 * Get favorite epics.
 */
export const getFavoriteEpics = (epics: IEpic[] | undefined): IEpic[] => {
  return epics?.filter((epic) => epic.is_favorite) ?? [];
};

// Usage
const EpicBreadcrumb = ({ epicId }: { epicId: string }) => {
  const { data: epics } = useProjectEpics(workspaceSlug, projectId);
  const epicName = getEpicNameById(epics, epicId);
  return <span>{epicName}</span>;
};
```

**Benefits:**
- Testable without React
- Reusable across components
- Type-safe
- Can be used in selectors or directly

---

### Pattern 3: Backward-Compatible Wrapper Hooks

This pattern allowed the Plane team to migrate 800+ components incrementally without breaking existing functionality:

```typescript
/**
 * Backward-compatible hook that wraps TanStack Query hooks.
 * Provides the old MobX EpicStore API while using TanStack Query internally.
 *
 * @deprecated Prefer using individual hooks directly:
 * - useProjectEpics(), useEpicDetails(), useCreateEpic(), useUpdateEpic()
 */
export function useEpic() {
  const createEpic = useCreateEpic();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();

  return {
    // Old MobX API (for backward compatibility)
    createEpicDetails: (workspaceSlug: string, projectId: string, data: any) =>
      createEpic.mutateAsync({ workspaceSlug, projectId, data }),

    updateEpicDetails: (workspaceSlug: string, projectId: string, epicId: string, data: any) =>
      updateEpic.mutateAsync({ workspaceSlug, projectId, epicId, data }),

    // New TanStack Query API (for new code)
    createEpic: createEpic.mutate,
    updateEpic: updateEpic.mutate,
    deleteEpic: deleteEpic.mutate,

    // Async versions
    createEpicAsync: createEpic.mutateAsync,
    updateEpicAsync: updateEpic.mutateAsync,

    // Loading states
    isCreating: createEpic.isPending,
    isUpdating: updateEpic.isPending,

    // Expose hooks for data fetching
    useProjectEpics,
    useEpicDetails,
  };
}
```

---

### Pattern 4: Optimistic Updates with Rollback

**From: `apps/web/core/store/queries/epic.ts`**

```typescript
export function useAddEpicToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: AddToFavoritesParams) =>
      epicService.addEpicToFavorites(workspaceSlug, projectId, epicId),

    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      // 1. Cancel any in-flight queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.epics.all(workspaceSlug, projectId)
      });

      // 2. Snapshot current state
      const previousEpics = queryClient.getQueryData<IEpic[]>(
        queryKeys.epics.all(workspaceSlug, projectId)
      );

      // 3. Optimistically update cache
      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((epic) =>
            epic.id === epicId ? { ...epic, is_favorite: true } : epic
          )
        );
      }

      // 4. Return context for rollback
      return { previousEpics, workspaceSlug, projectId, epicId };
    },

    onError: (error, variables, context) => {
      // 5. Rollback on error
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
      // Show error toast
      toast.error("Failed to add epic to favorites");
    },

    onSettled: (data, error, { workspaceSlug, projectId, epicId }) => {
      // 6. Invalidate to ensure consistency with server
      void queryClient.invalidateQueries({
        queryKey: queryKeys.epics.all(workspaceSlug, projectId)
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.epics.detail(epicId)
      });
    },
  });
}
```

**Key Steps:**
1. Cancel in-flight queries (prevent race conditions)
2. Snapshot current state (for rollback)
3. Optimistically update cache (instant UI feedback)
4. Return context (for error handling)
5. Rollback on error (maintain data integrity)
6. Invalidate queries (sync with server)

---

## Summary: Migration Checklist

Use this checklist for each domain you migrate:

```markdown
## Pre-Migration
- [ ] Audit current MobX store implementation
- [ ] Identify all components using the store
- [ ] Document current behavior and edge cases
- [ ] Write baseline tests

## Implementation
- [ ] Create query keys in centralized file
- [ ] Implement query hooks (useProjectEpics, etc.)
- [ ] Implement mutation hooks (useCreateEpic, etc.)
- [ ] Add optimistic updates for mutations
- [ ] Create utility functions (getEpicById, etc.)
- [ ] Create backward-compatible wrapper hook (optional)

## Testing
- [ ] Unit tests for query hooks
- [ ] Unit tests for mutation hooks
- [ ] Unit tests for utility functions
- [ ] Integration tests for key workflows
- [ ] E2E tests for critical paths
- [ ] Performance tests (no regressions)

## Migration
- [ ] Migrate components one-by-one or use feature flag
- [ ] Remove observer() wrappers
- [ ] Update useEffect patterns
- [ ] Handle loading/error states explicitly
- [ ] Verify feature parity

## Cleanup
- [ ] Remove MobX store file
- [ ] Remove backward-compatible wrapper
- [ ] Update documentation
- [ ] Remove feature flags
- [ ] Final E2E test pass

## Post-Migration
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Gather team feedback
- [ ] Document lessons learned
```

---

## Additional Resources

### Official Documentation
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Query Migration Guide](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-react-query-3)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [MobX Migration Guide](https://mobx.js.org/migrating-from-4-or-5.html)

### Community Resources
- [TkDodo's Practical React Query](https://tkdodo.eu/blog/practical-react-query)
- [React Query vs Redux](https://tkdodo.eu/blog/react-query-and-forms)

### Plane Treasury Fork References
- Phase 4 Migration Commit: `28d3ab6b6f`
- Query Hooks: `apps/web/core/store/queries/`
- Hook Wrappers: `apps/web/core/hooks/store/`
- E2E Tests: `tests/e2e/`

---

## Lessons Learned from Plane Migration

1. **Migrate by domain, not by component** - Keeps features working end-to-end
2. **Wrapper hooks ease transition** - Backward compatibility prevents breaking changes
3. **E2E tests catch integration issues** - Unit tests aren't enough for complex interactions
4. **Optimistic updates are worth the complexity** - Users expect instant feedback
5. **Query key structure matters** - Invest time designing hierarchical keys upfront
6. **Remove observer() systematically** - Leaving them causes subtle bugs
7. **Document patterns as you go** - Helps team adopt new patterns consistently
8. **Centralize query logic** - Makes refactoring and maintenance easier
9. **Test loading and error states** - Easy to forget but critical for UX
10. **Celebrate incremental progress** - Large migrations are marathons, not sprints

---

*Document created: December 2024*
*Based on: Plane Treasury fork Phase 4 migration (800+ components)*
*Research: TanStack Query v5, Zustand v4, MobX v6*
