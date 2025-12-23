# Pages MobX to TanStack Query + Zustand Migration Guide

This document explains how to migrate from the old MobX-based page stores to the new TanStack Query + Zustand pattern.

## Overview

The pages system has been migrated from MobX to:
- **TanStack Query** for server state (fetching, caching, mutations)
- **Zustand** for UI state (filters, editor state)

## Files Created

### Query Hooks
- `/apps/web/core/store/queries/page.ts` - TanStack Query hooks for pages
- Updated `/apps/web/core/store/queries/query-keys.ts` - Added page query keys

### UI State Stores
- `/apps/web/core/store/ui/page-editor.store.ts` - Editor state (Zustand)
- `/apps/web/core/store/ui/page-filters.store.ts` - Filter/search state (Zustand)

## Migration Patterns

### 1. Fetching Pages

**Before (MobX):**
```tsx
import { observer } from "mobx-react";
import { useProjectPageStore } from "@/hooks/store";

const PageList = observer(() => {
  const pageStore = useProjectPageStore();
  const { workspaceSlug, projectId } = useRouter();

  useEffect(() => {
    pageStore.fetchPagesList(workspaceSlug, projectId);
  }, [workspaceSlug, projectId]);

  return (
    <div>
      {pageStore.data && Object.values(pageStore.data).map(page => (
        <div key={page.id}>{page.name}</div>
      ))}
    </div>
  );
});
```

**After (TanStack Query):**
```tsx
import { useProjectPages } from "@/store/queries/page";
import { useRouter } from "next/navigation";

const PageList = () => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages, isLoading, isError } = useProjectPages(workspaceSlug, projectId);

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage />;
  if (!pages) return <EmptyState />;

  return (
    <div>
      {pages.map(page => (
        <div key={page.id}>{page.name}</div>
      ))}
    </div>
  );
};
```

**Key Changes:**
- Removed `observer()` wrapper
- Removed `useEffect` for data fetching
- Query automatically refetches when `workspaceSlug` or `projectId` changes
- Explicit loading and error states
- Data is an array, not a Record<id, Page>

### 2. Creating Pages

**Before (MobX):**
```tsx
const CreatePage = observer(() => {
  const pageStore = useProjectPageStore();

  const handleCreate = async () => {
    try {
      await pageStore.createPage({ name: "New Page" });
    } catch (error) {
      console.error(error);
    }
  };

  return <button onClick={handleCreate}>Create Page</button>;
});
```

**After (TanStack Query):**
```tsx
const CreatePage = () => {
  const { workspaceSlug, projectId } = useRouter();
  const { mutate: createPage, isPending } = useCreatePage();

  const handleCreate = () => {
    createPage(
      { workspaceSlug, projectId, data: { name: "New Page" } },
      {
        onSuccess: (newPage) => {
          toast.success("Page created");
          router.push(`/${workspaceSlug}/projects/${projectId}/pages/${newPage.id}`);
        },
        onError: (error) => {
          toast.error("Failed to create page");
        },
      }
    );
  };

  return (
    <button onClick={handleCreate} disabled={isPending}>
      {isPending ? "Creating..." : "Create Page"}
    </button>
  );
};
```

**Key Changes:**
- Use `useCreatePage()` hook instead of store method
- Pass parameters as object with `workspaceSlug`, `projectId`, `data`
- Use `isPending` for loading state
- Callbacks for success/error handling

### 3. Updating Pages

**Before (MobX):**
```tsx
const UpdatePageButton = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleUpdate = async () => {
    await page?.update({ name: "Updated Name" });
  };

  return <button onClick={handleUpdate}>Update</button>;
});
```

**After (TanStack Query):**
```tsx
const UpdatePageButton = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages } = useProjectPages(workspaceSlug, projectId);
  const page = getPageById(pages, pageId);
  const { mutate: updatePage, isPending } = useUpdatePage();

  const handleUpdate = () => {
    updatePage(
      { workspaceSlug, projectId, pageId, data: { name: "Updated Name" } },
      {
        onSuccess: () => toast.success("Page updated"),
        onError: () => toast.error("Failed to update page"),
      }
    );
  };

  return (
    <button onClick={handleUpdate} disabled={isPending}>
      {isPending ? "Updating..." : "Update"}
    </button>
  );
};
```

**Key Changes:**
- Use `useUpdatePage()` hook
- Use utility function `getPageById()` to find page
- Optimistic updates happen automatically
- Loading state via `isPending`

### 4. Page Access Control (Public/Private)

**Before (MobX):**
```tsx
const AccessToggle = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleToggle = async () => {
    if (page?.access === EPageAccess.PUBLIC) {
      await page.makePrivate({ shouldSync: true });
    } else {
      await page.makePublic({ shouldSync: true });
    }
  };

  return <button onClick={handleToggle}>Toggle Access</button>;
});
```

**After (TanStack Query):**
```tsx
import { EPageAccess } from "@plane/constants";

const AccessToggle = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages } = useProjectPages(workspaceSlug, projectId);
  const page = getPageById(pages, pageId);
  const { mutate: updateAccess, isPending } = useUpdatePageAccess();

  const handleToggle = () => {
    const newAccess = page?.access === EPageAccess.PUBLIC ? EPageAccess.PRIVATE : EPageAccess.PUBLIC;
    updateAccess(
      { workspaceSlug, projectId, pageId, access: newAccess },
      {
        onSuccess: () => toast.success("Access updated"),
      }
    );
  };

  return (
    <button onClick={handleToggle} disabled={isPending}>
      {page?.access === EPageAccess.PUBLIC ? "Make Private" : "Make Public"}
    </button>
  );
};
```

### 5. Locking/Unlocking Pages

**Before (MobX):**
```tsx
const LockToggle = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleToggle = async () => {
    if (page?.is_locked) {
      await page.unlock({ shouldSync: true });
    } else {
      await page.lock({ shouldSync: true });
    }
  };

  return <button onClick={handleToggle}>Toggle Lock</button>;
});
```

**After (TanStack Query):**
```tsx
const LockToggle = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages } = useProjectPages(workspaceSlug, projectId);
  const page = getPageById(pages, pageId);
  const { mutate: lockPage } = useLockPage();
  const { mutate: unlockPage } = useUnlockPage();

  const handleToggle = () => {
    if (page?.is_locked) {
      unlockPage({ workspaceSlug, projectId, pageId });
    } else {
      lockPage({ workspaceSlug, projectId, pageId });
    }
  };

  return (
    <button onClick={handleToggle}>
      {page?.is_locked ? "Unlock" : "Lock"}
    </button>
  );
};
```

### 6. Archiving Pages

**Before (MobX):**
```tsx
const ArchiveButton = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleArchive = async () => {
    await page?.archive({ shouldSync: true });
  };

  return <button onClick={handleArchive}>Archive</button>;
});
```

**After (TanStack Query):**
```tsx
const ArchiveButton = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { mutate: archivePage, isPending } = useArchivePage();

  const handleArchive = () => {
    archivePage(
      { workspaceSlug, projectId, pageId },
      {
        onSuccess: () => {
          toast.success("Page archived");
          router.push(`/${workspaceSlug}/projects/${projectId}/pages`);
        },
      }
    );
  };

  return (
    <button onClick={handleArchive} disabled={isPending}>
      Archive
    </button>
  );
};
```

### 7. Filtering and Searching Pages

**Before (MobX):**
```tsx
const PageSearch = observer(() => {
  const pageStore = useProjectPageStore();

  const handleSearch = (query: string) => {
    pageStore.updateFilters("searchQuery", query);
  };

  return (
    <input
      value={pageStore.filters.searchQuery}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
});
```

**After (Zustand for UI State):**
```tsx
import { usePageFiltersStore } from "@/store/ui/page-filters.store";

const PageSearch = () => {
  const { filters, updateFilter } = usePageFiltersStore();

  return (
    <input
      value={filters.searchQuery}
      onChange={(e) => updateFilter("searchQuery", e.target.value)}
    />
  );
};
```

**Using Filters with Query Data:**
```tsx
import { usePageFiltersStore } from "@/store/ui/page-filters.store";
import { getPageNameById, filterPagesByAccess } from "@/store/queries/page";

const FilteredPageList = () => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages } = useProjectPages(workspaceSlug, projectId);
  const { filters } = usePageFiltersStore();

  // Filter pages based on UI filters
  const filteredPages = useMemo(() => {
    if (!pages) return [];

    let result = pages;

    // Apply search filter
    if (filters.searchQuery) {
      result = result.filter(page =>
        page.name?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      const aValue = a[filters.sortKey];
      const bValue = b[filters.sortKey];
      return filters.sortBy === "asc" ?
        String(aValue).localeCompare(String(bValue)) :
        String(bValue).localeCompare(String(aValue));
    });

    return result;
  }, [pages, filters]);

  return (
    <div>
      {filteredPages.map(page => (
        <div key={page.id}>{page.name}</div>
      ))}
    </div>
  );
};
```

### 8. Page Editor State

**Before (MobX):**
```tsx
const PageEditor = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleEditorRef = (ref: EditorRefApi) => {
    page?.editor.setEditorRef(ref);
  };

  return <Editor ref={handleEditorRef} />;
});
```

**After (Zustand):**
```tsx
import { usePageEditorStore } from "@/store/ui/page-editor.store";

const PageEditor = ({ pageId }: { pageId: string }) => {
  const { setEditorRef } = usePageEditorStore();

  const handleEditorRef = (ref: EditorRefApi) => {
    setEditorRef(ref);
  };

  return <Editor ref={handleEditorRef} />;
};
```

### 9. Favorites

**Before (MobX):**
```tsx
const FavoriteToggle = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();
  const page = pageStore.getPageById(pageId);

  const handleToggle = async () => {
    if (page?.is_favorite) {
      await page.removePageFromFavorites();
    } else {
      await page.addToFavorites();
    }
  };

  return <button onClick={handleToggle}>Toggle Favorite</button>;
});
```

**After (TanStack Query):**
```tsx
const FavoriteToggle = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { data: pages } = useProjectPages(workspaceSlug, projectId);
  const page = getPageById(pages, pageId);
  const { mutate: addToFavorites } = useAddPageToFavorites();
  const { mutate: removeFromFavorites } = useRemovePageFromFavorites();

  const handleToggle = () => {
    if (page?.is_favorite) {
      removeFromFavorites({ workspaceSlug, projectId, pageId });
    } else {
      addToFavorites({ workspaceSlug, projectId, pageId });
    }
  };

  return (
    <button onClick={handleToggle}>
      {page?.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
    </button>
  );
};
```

### 10. Deleting Pages

**Before (MobX):**
```tsx
const DeleteButton = observer(({ pageId }: { pageId: string }) => {
  const pageStore = useProjectPageStore();

  const handleDelete = async () => {
    await pageStore.removePage({ pageId, shouldSync: true });
  };

  return <button onClick={handleDelete}>Delete</button>;
});
```

**After (TanStack Query):**
```tsx
const DeleteButton = ({ pageId }: { pageId: string }) => {
  const { workspaceSlug, projectId } = useRouter();
  const { mutate: deletePage, isPending } = useDeletePage();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this page?")) {
      deletePage(
        { workspaceSlug, projectId, pageId },
        {
          onSuccess: () => {
            toast.success("Page deleted");
            router.push(`/${workspaceSlug}/projects/${projectId}/pages`);
          },
        }
      );
    }
  };

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
};
```

## Available Hooks

### Query Hooks (Read Operations)
- `useProjectPages(workspaceSlug, projectId)` - Fetch all pages
- `usePageDetails(workspaceSlug, projectId, pageId, options?)` - Fetch page details
- `useArchivedPages(workspaceSlug, projectId)` - Fetch archived pages
- `useFavoritePages(workspaceSlug, projectId)` - Fetch favorite pages

### Mutation Hooks (Write Operations)
- `useCreatePage()` - Create a new page
- `useUpdatePage()` - Update page properties
- `useUpdatePageDescription()` - Update page description/content
- `useUpdatePageAccess()` - Change page access (public/private)
- `useLockPage()` - Lock a page
- `useUnlockPage()` - Unlock a page
- `useArchivePage()` - Archive a page
- `useRestorePage()` - Restore an archived page
- `useDeletePage()` - Delete a page
- `useDuplicatePage()` - Duplicate a page
- `useMovePage()` - Move page to different project
- `useAddPageToFavorites()` - Add to favorites
- `useRemovePageFromFavorites()` - Remove from favorites

### Utility Functions
- `getPageById(pages, pageId)` - Find page by ID
- `getPageNameById(pages, pageId)` - Get page name by ID
- `getPageIds(pages)` - Extract page IDs
- `getActivePages(pages)` - Filter non-archived pages
- `getFavoritePages(pages)` - Filter favorite pages
- `getLockedPages(pages)` - Filter locked pages
- `filterPagesByAccess(pages, access)` - Filter by access level

### UI State Stores (Zustand)
- `usePageEditorStore()` - Editor state (ref, assets)
- `usePageFiltersStore()` - Filters and search

## Migration Checklist

When migrating a component:

- [ ] Remove `observer()` wrapper from component
- [ ] Remove MobX imports (`mobx`, `mobx-react`)
- [ ] Replace store hooks with TanStack Query hooks
- [ ] Remove `useEffect` for data fetching (queries handle this)
- [ ] Handle loading states explicitly (`isLoading`, `isPending`)
- [ ] Handle error states explicitly (`isError`, `error`)
- [ ] Update mutation calls to pass parameters as objects
- [ ] Add success/error callbacks to mutations
- [ ] Use utility functions for derived data
- [ ] Use Zustand stores for UI state (filters, editor)
- [ ] Test optimistic updates work correctly
- [ ] Verify cache invalidation after mutations

## Benefits of New Pattern

1. **Automatic Caching** - TanStack Query handles caching automatically
2. **Optimistic Updates** - Instant UI feedback with automatic rollback on errors
3. **Loading States** - Built-in loading states for better UX
4. **Error Handling** - Explicit error states and retry logic
5. **No Manual Subscriptions** - Queries automatically refetch when dependencies change
6. **Better DevTools** - TanStack Query DevTools for debugging
7. **Separation of Concerns** - Server state (TanStack Query) vs UI state (Zustand)
8. **Type Safety** - Better TypeScript inference
9. **Testability** - Easier to test with mock query client
10. **Performance** - Smarter refetching and caching strategies

## Common Patterns

### Pattern: Conditional Fetching
```tsx
// Only fetch if user has access
const { data: pages } = useProjectPages(workspaceSlug, projectId, {
  enabled: !!workspaceSlug && !!projectId && hasAccess,
});
```

### Pattern: Dependent Queries
```tsx
// Fetch page details only after pages list is loaded
const { data: pages } = useProjectPages(workspaceSlug, projectId);
const firstPageId = pages?.[0]?.id;
const { data: pageDetails } = usePageDetails(workspaceSlug, projectId, firstPageId!, {
  enabled: !!firstPageId,
});
```

### Pattern: Refetch on Interval
```tsx
// Poll for updates every 30 seconds
const { data: pages } = useProjectPages(workspaceSlug, projectId, {
  refetchInterval: 30 * 1000,
});
```

### Pattern: Background Updates
```tsx
// Refetch when window regains focus
const { data: pages } = useProjectPages(workspaceSlug, projectId, {
  refetchOnWindowFocus: true,
});
```

## Troubleshooting

### Issue: Data not updating after mutation
**Solution:** Check that `onSettled` is invalidating the correct query keys.

### Issue: Stale data showing
**Solution:** Adjust `staleTime` in query options or force refetch with `queryClient.invalidateQueries()`.

### Issue: Too many refetches
**Solution:** Increase `staleTime` or disable `refetchOnWindowFocus`.

### Issue: Race conditions
**Solution:** Ensure `cancelQueries()` is called in `onMutate` before optimistic updates.

### Issue: Lost UI state on navigation
**Solution:** UI state (filters) should be in Zustand stores, not component state.

## Next Steps

1. Update components to use new hooks
2. Remove old MobX store files once all components are migrated:
   - `apps/web/core/store/pages/base-page.ts`
   - `apps/web/core/store/pages/project-page.store.ts`
   - `apps/web/core/store/pages/page-editor-info.ts`
   - `apps/web/core/store/pages/project-page.ts`
3. Run tests to ensure functionality is preserved
4. Update integration tests to work with TanStack Query

## References

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Migration Best Practices](/docs/mobx-to-tanstack-query-migration-best-practices.md)
