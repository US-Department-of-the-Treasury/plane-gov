# New Hooks Quick Reference Guide

Quick reference for the hooks added in the December 22, 2024 migration session.

---

## Workspace Views (TanStack Query)

### Fetching Workspace Views

```tsx
import { useWorkspaceViews } from "@/store/queries/view";

function WorkspaceViewsList({ workspaceSlug }: { workspaceSlug: string }) {
  const { data: views, isLoading, error } = useWorkspaceViews(workspaceSlug);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {views?.map((view) => (
        <li key={view.id}>{view.name}</li>
      ))}
    </ul>
  );
}
```

### Fetching Workspace View Details

```tsx
import { useWorkspaceViewDetails } from "@/store/queries/view";

function WorkspaceViewDetail({ workspaceSlug, viewId }: Props) {
  const { data: view, isLoading } = useWorkspaceViewDetails(workspaceSlug, viewId);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>{view?.name}</h1>
      <p>{view?.description}</p>
    </div>
  );
}
```

### Creating a Workspace View

```tsx
import { useCreateWorkspaceView } from "@/store/queries/view";
import { useState } from "react";

function CreateViewButton({ workspaceSlug }: { workspaceSlug: string }) {
  const { mutate: createView, isPending } = useCreateWorkspaceView();
  const [name, setName] = useState("");

  const handleCreate = () => {
    createView(
      {
        workspaceSlug,
        data: {
          name,
          description: "My workspace view",
          rich_filters: {},
        },
      },
      {
        onSuccess: (newView) => {
          console.log("Created view:", newView);
          // Navigate or show success message
        },
        onError: (error) => {
          console.error("Failed to create view:", error);
          // Show error message
        },
      }
    );
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="View name" />
      <button onClick={handleCreate} disabled={isPending}>
        {isPending ? "Creating..." : "Create View"}
      </button>
    </div>
  );
}
```

### Updating a Workspace View

```tsx
import { useUpdateWorkspaceView } from "@/store/queries/view";

function UpdateViewButton({ workspaceSlug, viewId }: Props) {
  const { mutate: updateView, isPending } = useUpdateWorkspaceView();

  const handleUpdate = () => {
    updateView(
      {
        workspaceSlug,
        viewId,
        data: {
          name: "Updated View Name",
          description: "Updated description",
        },
        shouldSyncFilters: true, // Optional: sync filters with issues
      },
      {
        onSuccess: (updatedView) => {
          console.log("Updated view:", updatedView);
        },
      }
    );
  };

  return (
    <button onClick={handleUpdate} disabled={isPending}>
      {isPending ? "Updating..." : "Update View"}
    </button>
  );
}
```

### Deleting a Workspace View

```tsx
import { useDeleteWorkspaceView } from "@/store/queries/view";

function DeleteViewButton({ workspaceSlug, viewId }: Props) {
  const { mutate: deleteView, isPending } = useDeleteWorkspaceView();

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this view?")) return;

    deleteView(
      { workspaceSlug, viewId },
      {
        onSuccess: () => {
          console.log("View deleted");
          // Navigate away or show success message
        },
      }
    );
  };

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-red-600">
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Helper Function: Get View by ID

```tsx
import { getWorkspaceViewById } from "@/store/queries/view";
import { useQueryClient } from "@tanstack/react-query";

function MyComponent({ workspaceSlug, viewId }: Props) {
  const queryClient = useQueryClient();

  // Get view from cache without triggering a fetch
  const views = queryClient.getQueryData([...queryKeys.views.all(workspaceSlug, ""), "workspace"]);
  const view = getWorkspaceViewById(views, viewId);

  return <div>{view?.name}</div>;
}
```

---

## Epic Filters (Zustand)

### Basic Usage

```tsx
import { useProjectEpicFilters } from "@/store/queries/epic-filters.zustand";

function EpicFilters({ projectId }: { projectId: string }) {
  const {
    displayFilters,
    filters,
    searchQuery,
    updateDisplayFilters,
    updateFilters,
    updateSearchQuery,
    clearAllFilters,
  } = useProjectEpicFilters(projectId);

  return (
    <div>
      {/* Search */}
      <input value={searchQuery} onChange={(e) => updateSearchQuery(e.target.value)} placeholder="Search epics..." />

      {/* Layout Toggle */}
      <button
        onClick={() => updateDisplayFilters({ layout: displayFilters?.layout === "list" ? "kanban" : "list" })}
      >
        Layout: {displayFilters?.layout || "list"}
      </button>

      {/* Order By */}
      <select value={displayFilters?.order_by} onChange={(e) => updateDisplayFilters({ order_by: e.target.value })}>
        <option value="sort_order">Manual</option>
        <option value="name">Name</option>
        <option value="-created_at">Newest</option>
        <option value="created_at">Oldest</option>
      </select>

      {/* Clear Filters */}
      <button onClick={() => clearAllFilters()}>Clear All Filters</button>
    </div>
  );
}
```

### Advanced: Direct Store Access

```tsx
import { useEpicFilters } from "@/store/queries/epic-filters.zustand";

function EpicFilterManager() {
  // Access any part of the store
  const displayFilters = useEpicFilters((state) => state.displayFilters);
  const updateFilters = useEpicFilters((state) => state.updateFilters);
  const searchQuery = useEpicFilters((state) => state.searchQuery);

  // Access filters for specific project
  const projectFilters = useEpicFilters((state) => state.getFiltersByProjectId("project-123"));

  return <div>...</div>;
}
```

### Archived Epics Filters

```tsx
import { useProjectEpicFilters } from "@/store/queries/epic-filters.zustand";

function ArchivedEpicsFilters({ projectId }: { projectId: string }) {
  const { archivedFilters, archivedEpicsSearchQuery, updateArchivedEpicsSearchQuery, updateFilters, clearAllFilters } =
    useProjectEpicFilters(projectId);

  return (
    <div>
      <input
        value={archivedEpicsSearchQuery}
        onChange={(e) => updateArchivedEpicsSearchQuery(e.target.value)}
        placeholder="Search archived epics..."
      />

      {/* Update archived filters */}
      <button
        onClick={() =>
          updateFilters(
            {
              status: ["completed"],
            },
            "archived" // Specify archived state
          )
        }
      >
        Show Completed Only
      </button>

      {/* Clear archived filters */}
      <button onClick={() => clearAllFilters("archived")}>Clear Archived Filters</button>
    </div>
  );
}
```

---

## Sprint Filters (Zustand)

### Basic Usage

```tsx
import { useProjectSprintFilters } from "@/store/queries/sprint-filters.zustand";

function SprintFilters({ projectId }: { projectId: string }) {
  const { displayFilters, filters, searchQuery, updateDisplayFilters, updateSearchQuery } =
    useProjectSprintFilters(projectId);

  return (
    <div>
      {/* Search */}
      <input value={searchQuery} onChange={(e) => updateSearchQuery(e.target.value)} placeholder="Search sprints..." />

      {/* Active/Archived Tab */}
      <div>
        <button
          className={displayFilters?.active_tab === "active" ? "active" : ""}
          onClick={() => updateDisplayFilters({ active_tab: "active" })}
        >
          Active Sprints
        </button>
        <button
          className={displayFilters?.active_tab === "archived" ? "active" : ""}
          onClick={() => updateDisplayFilters({ active_tab: "archived" })}
        >
          Archived
        </button>
      </div>

      {/* Layout Toggle */}
      <button
        onClick={() => updateDisplayFilters({ layout: displayFilters?.layout === "list" ? "kanban" : "list" })}
      >
        {displayFilters?.layout === "list" ? "List View" : "Kanban View"}
      </button>
    </div>
  );
}
```

### Initializing Filters

```tsx
import { useProjectSprintFilters } from "@/store/queries/sprint-filters.zustand";
import { useEffect } from "react";

function SprintView({ projectId }: { projectId: string }) {
  const { initProjectSprintFilters } = useProjectSprintFilters(projectId);

  // Initialize filters when component mounts or project changes
  useEffect(() => {
    initProjectSprintFilters();
  }, [projectId, initProjectSprintFilters]);

  return <div>...</div>;
}
```

---

## Combining Hooks

### Epic List with Filters

```tsx
import { useProjectEpics } from "@/store/queries/epic";
import { useProjectEpicFilters } from "@/store/queries/epic-filters.zustand";
import { shouldFilterEpic, orderEpics } from "@plane/utils";

function FilteredEpicsList({ workspaceSlug, projectId }: Props) {
  // Fetch epics from server
  const { data: epics, isLoading } = useProjectEpics(workspaceSlug, projectId);

  // Get filters from Zustand
  const { displayFilters, filters, searchQuery } = useProjectEpicFilters(projectId);

  // Apply filters client-side
  const filteredEpics = epics
    ?.filter((epic) => epic.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((epic) => shouldFilterEpic(epic, displayFilters ?? {}, filters ?? {}));

  // Apply ordering
  const orderedEpics = orderEpics(filteredEpics || [], displayFilters?.order_by);

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {orderedEpics.map((epic) => (
        <li key={epic.id}>{epic.name}</li>
      ))}
    </ul>
  );
}
```

### Sprint List with Filters

```tsx
import { useWorkspaceSprints } from "@/store/queries/sprint";
import { useProjectSprintFilters } from "@/store/queries/sprint-filters.zustand";
import { orderSprints, shouldFilterSprint } from "@plane/utils";

function FilteredSprintsList({ workspaceSlug }: { workspaceSlug: string }) {
  // Fetch sprints from server
  const { data: sprints, isLoading } = useWorkspaceSprints(workspaceSlug);

  // Get filters from Zustand
  const { displayFilters, filters, searchQuery } = useProjectSprintFilters(projectId);

  // Apply filters
  const filteredSprints = sprints
    ?.filter((sprint) => sprint.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((sprint) => {
      // Show active or archived based on tab
      if (displayFilters?.active_tab === "archived") {
        return !!sprint.archived_at;
      }
      return !sprint.archived_at;
    })
    .filter((sprint) => shouldFilterSprint(sprint, filters ?? {}));

  // Apply ordering
  const orderedSprints = orderSprints(filteredSprints || [], true);

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {orderedSprints.map((sprint) => (
        <li key={sprint.id}>{sprint.name}</li>
      ))}
    </ul>
  );
}
```

---

## Key Differences from MobX

### Before (MobX)
```tsx
// Had to inject root store and observe
const GlobalViewStore = observer(function GlobalViewStore() {
  const { globalView } = useMobxStore();
  const views = globalView.currentWorkspaceViews;

  return <div>{views?.map(...)}</div>;
});
```

### After (TanStack Query)
```tsx
// Direct hook usage, automatic re-renders
function WorkspaceViews({ workspaceSlug }: Props) {
  const { data: views } = useWorkspaceViews(workspaceSlug);

  return <div>{views?.map(...)}</div>;
}
```

### Before (MobX Filter Store)
```tsx
// Complex observer pattern
const EpicFilters = observer(function EpicFilters() {
  const { epicFilter } = useMobxStore();
  const filters = epicFilter.currentProjectFilters;

  return <div>...</div>;
});
```

### After (Zustand)
```tsx
// Simple hook usage
function EpicFilters({ projectId }: Props) {
  const { filters } = useProjectEpicFilters(projectId);

  return <div>...</div>;
}
```

---

## TypeScript Tips

All hooks are fully typed. Use TypeScript's autocomplete for available properties:

```tsx
const {
  // Ctrl+Space here to see all available properties
} = useProjectEpicFilters(projectId);

const {
  data: views, // IWorkspaceView[]
  isLoading, // boolean
  error, // Error | null
  refetch, // () => Promise<...>
} = useWorkspaceViews(workspaceSlug);
```

---

## Performance Tips

### TanStack Query

1. **Avoid unnecessary refetches:**
   ```tsx
   // Good: only fetches when needed
   const { data } = useWorkspaceViews(workspaceSlug);

   // Bad: fetches on every render
   const { data } = useWorkspaceViews(getWorkspaceSlug());
   ```

2. **Use staleTime for less frequent updates:**
   ```tsx
   // Data stays fresh for 10 minutes
   useQuery({
     ...useWorkspaceViews(workspaceSlug),
     staleTime: 10 * 60 * 1000,
   });
   ```

### Zustand

1. **Select only what you need:**
   ```tsx
   // Good: only re-renders when searchQuery changes
   const searchQuery = useEpicFilters((state) => state.searchQuery);

   // Bad: re-renders on any state change
   const state = useEpicFilters();
   ```

2. **Use helper hooks for common patterns:**
   ```tsx
   // Good: optimized selector
   const filters = useProjectEpicFilters(projectId);

   // Less optimal: manual selection
   const filters = useEpicFilters((state) => state.getFiltersByProjectId(projectId));
   ```

---

## Debugging

### TanStack Query DevTools

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### Zustand DevTools

```tsx
import { devtools } from "zustand/middleware";

export const useEpicFilters = create<EpicFiltersState>()(
  devtools((set, get) => ({
    // ... state
  }))
);
```

---

## Common Patterns

### Loading States

```tsx
const { data, isLoading, error } = useWorkspaceViews(workspaceSlug);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <ViewsList views={data} />;
```

### Optimistic Updates

```tsx
const { mutate: updateView } = useUpdateWorkspaceView();

// Update happens immediately in UI, rolls back on error
updateView({
  workspaceSlug,
  viewId,
  data: { name: "New Name" },
});
```

### Dependent Queries

```tsx
const { data: views } = useWorkspaceViews(workspaceSlug);
const viewId = views?.[0]?.id;

// Only fetches when viewId is available
const { data: viewDetails } = useWorkspaceViewDetails(workspaceSlug, viewId!);
```

---

**Need more examples?** Check the JSDoc comments in each file for detailed usage examples!
