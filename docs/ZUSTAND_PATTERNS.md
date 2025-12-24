# Zustand Store Patterns in Plane

This document describes the Zustand store patterns used across the Plane codebase after the migration from MobX to TanStack Query + Zustand.

## Overview

The Plane codebase uses a **hybrid state management approach**:

1. **TanStack Query** - Server state management (data fetching, caching, mutations)
2. **Zustand** - Client-side state management (UI state, filters, themes, etc.)
3. **Legacy class wrappers** - Backward compatibility layer during migration

All three frontend apps (web, admin, space) have been fully migrated from MobX to this pattern.

## Architecture

### Directory Structure

```
apps/{app}/
├── core/
│   ├── store/
│   │   ├── client/                    # Zustand stores
│   │   │   ├── theme.store.ts
│   │   │   ├── router.store.ts
│   │   │   ├── sprint-filter.store.ts
│   │   │   ├── epic-filter.store.ts
│   │   │   └── index.ts               # Re-exports all stores
│   │   ├── queries/                   # TanStack Query hooks
│   │   │   ├── project.ts
│   │   │   ├── workspace.ts
│   │   │   ├── query-keys.ts
│   │   │   └── query-provider.tsx
│   │   └── root.store.ts              # Legacy root store (mostly empty)
│   └── hooks/
│       └── store/                     # Store hooks/facades
│           ├── use-project.ts
│           ├── use-workspace.ts
│           └── use-app-theme.ts
└── package.json
```

## Zustand Store Patterns

### 1. Basic Store Structure

**File naming:** `{domain}.store.ts` or `{domain}-{feature}.store.ts`

**Pattern:**

```typescript
import { create } from "zustand";

// Define state interface
interface MyState {
  // State properties
  count: number;
  name: string;
}

// Define actions interface
interface MyActions {
  // Actions (setters/updaters)
  increment: () => void;
  setName: (name: string) => void;
}

// Combined store type
export type MyStore = MyState & MyActions;

// Create store
export const useMyStore = create<MyStore>()((set, get) => ({
  // Initial state
  count: 0,
  name: "",

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  setName: (name) => set({ name }),
}));
```

### 2. Store with Persistence (localStorage)

**Example:** `/apps/web/core/store/client/theme.store.ts`

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ThemeState {
  sidebarCollapsed: boolean;
  theme: string | undefined;
}

interface ThemeActions {
  toggleSidebar: (collapsed?: boolean) => void;
  setTheme: (theme: string) => void;
}

export type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      theme: undefined,

      toggleSidebar: (collapsed) =>
        set((state) => ({
          sidebarCollapsed: collapsed ?? !state.sidebarCollapsed,
        })),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "plane-theme-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist specific fields (exclude ephemeral state)
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
```

**Key patterns:**

- Use `persist` middleware for localStorage sync
- Use `partialize` to exclude ephemeral state from persistence
- Use `createJSONStorage(() => localStorage)` for storage adapter

### 3. Store with Computed Values (Getters)

**Example:** `/apps/web/core/store/client/sprint-filter.store.ts`

```typescript
interface SprintFilterState {
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, TSprintFiltersByState>;
  searchQuery: string;
}

interface SprintFilterActions {
  // Getters (computed values)
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;

  // Actions
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters) => void;
}

export const useSprintFilterStore = create<SprintFilterStore>()((set, get) => ({
  displayFilters: {},
  filters: {},
  searchQuery: "",

  // Getters use get() to access current state
  getDisplayFiltersByProjectId: (projectId) => get().displayFilters[projectId],

  getFiltersByProjectId: (projectId) => get().filters[projectId]?.default ?? {},

  // Actions
  updateDisplayFilters: (projectId, displayFilters) => {
    set((state) => {
      const newDisplayFilters = { ...state.displayFilters };
      Object.keys(displayFilters).forEach((key) => {
        newDisplayFilters[projectId] = {
          ...newDisplayFilters[projectId],
          ...displayFilters,
        };
      });
      return { displayFilters: newDisplayFilters };
    });
  },
}));
```

**Key patterns:**

- Getters are functions that accept parameters and return computed values
- Use `get()` inside getters to access current state
- Getters are NOT reactive (use selectors in components for reactivity)

### 4. Store with Manual localStorage Sync

**Example:** `/apps/web/core/store/queries/epic-filters.zustand.ts`

```typescript
import { storage } from "@/lib/local-storage";

const EPIC_DISPLAY_FILTERS_KEY = "epic_display_filters";
const EPIC_FILTERS_KEY = "epic_filters";

interface EpicFiltersState {
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, TEpicFiltersByState>;

  // Internal methods for persistence
  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}

export const useEpicFilters = create<EpicFiltersState>((set, get) => ({
  displayFilters: {},
  filters: {},

  updateDisplayFilters: (projectId, newDisplayFilters) => {
    set((state) => ({
      displayFilters: {
        ...state.displayFilters,
        [projectId]: {
          ...state.displayFilters[projectId],
          ...newDisplayFilters,
        },
      },
    }));
    // Save after each update
    get().saveToLocalStorage();
  },

  loadFromLocalStorage: () => {
    try {
      const displayFiltersData = storage.get(EPIC_DISPLAY_FILTERS_KEY);
      if (displayFiltersData) {
        const parsed = JSON.parse(displayFiltersData);
        set({ displayFilters: parsed });
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  },

  saveToLocalStorage: () => {
    try {
      const { displayFilters, filters } = get();
      storage.set(EPIC_DISPLAY_FILTERS_KEY, JSON.stringify(displayFilters));
      storage.set(EPIC_FILTERS_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  },
}));

// Load initial data from localStorage
if (typeof window !== "undefined") {
  useEpicFilters.getState().loadFromLocalStorage();
}
```

**Key patterns:**

- Manual localStorage methods give more control than `persist` middleware
- Call `saveToLocalStorage()` after mutations
- Load initial state at module initialization (not in constructor)

### 5. Legacy Class Wrappers (Backward Compatibility)

**Pattern for migration compatibility:**

```typescript
// Modern Zustand store
export const useThemeStore = create<ThemeStore>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: (collapsed) => set({ sidebarCollapsed: collapsed ?? !state.sidebarCollapsed }),
}));

// Legacy interface (matches old MobX API)
export interface IThemeStore {
  sidebarCollapsed: boolean | undefined;
  toggleSidebar: (collapsed?: boolean) => void;
}

// Legacy class wrapper for backward compatibility
export class ThemeStoreLegacy implements IThemeStore {
  get sidebarCollapsed() {
    return useThemeStore.getState().sidebarCollapsed;
  }

  toggleSidebar = (collapsed?: boolean) => {
    useThemeStore.getState().toggleSidebar(collapsed);
  };
}
```

**Usage in root store:**

```typescript
// apps/web/core/store/root.store.ts
import { ThemeStoreLegacy as ThemeStore } from "./client";

export class CoreRootStore {
  theme: IThemeStore;

  constructor() {
    this.theme = new ThemeStoreLegacy();
  }
}
```

**Key patterns:**

- Legacy class uses `useStore.getState()` to access/update Zustand store
- Implements old MobX interface for drop-in replacement
- Mark as `@deprecated` to guide migration

### 6. Component Usage Patterns

#### Direct Zustand Hook (Recommended)

```tsx
import { useThemeStore } from "@/store/client";

function MyComponent() {
  // Subscribe to entire store
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();

  // OR subscribe to specific fields (more performant)
  const sidebarCollapsed = useThemeStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useThemeStore((state) => state.toggleSidebar);

  return <button onClick={() => toggleSidebar()}>Toggle Sidebar</button>;
}
```

#### Selector Pattern (Optimized)

```tsx
// Subscribe only to what you need
const displayFilters = useEpicFilters((state) => state.getDisplayFiltersByProjectId(projectId));

// Multiple selectors
const { displayFilters, updateDisplayFilters } = useEpicFilters((state) => ({
  displayFilters: state.getDisplayFiltersByProjectId(projectId),
  updateDisplayFilters: state.updateDisplayFilters,
}));
```

#### Custom Hook Wrapper

```tsx
// apps/web/core/hooks/store/use-app-theme.ts
import { useThemeStore } from "@/store/client";

export const useAppTheme = () => {
  return useThemeStore();
};
```

**Key patterns:**

- Use selectors to subscribe only to needed state (prevents unnecessary re-renders)
- Custom hooks provide a clean API and can add business logic
- Direct Zustand hooks are preferred over legacy class-based access

### 7. Project-Scoped Helper Hooks

**Example:** `/apps/web/core/store/queries/epic-filters.zustand.ts`

```typescript
/**
 * Helper hook to get epic filters for a specific project
 * Automatically scopes selectors to the projectId
 */
export function useProjectEpicFilters(projectId: string) {
  return useEpicFilters((state) => ({
    displayFilters: state.getDisplayFiltersByProjectId(projectId),
    filters: state.getFiltersByProjectId(projectId),
    searchQuery: state.searchQuery,
    // Pre-bind actions with projectId
    updateDisplayFilters: (filters: TEpicDisplayFilters) => state.updateDisplayFilters(projectId, filters),
    updateFilters: (filters: TEpicFilters) => state.updateFilters(projectId, filters),
    clearAllFilters: () => state.clearAllFilters(projectId),
  }));
}
```

**Usage:**

```tsx
function EpicFilters({ projectId }: { projectId: string }) {
  const { displayFilters, updateDisplayFilters } = useProjectEpicFilters(projectId);

  return <FilterUI filters={displayFilters} onChange={updateDisplayFilters} />;
}
```

## TanStack Query Integration

### Query Keys Factory

**File:** `/apps/web/core/store/queries/query-keys.ts`

```typescript
export const queryKeys = {
  projects: {
    all: (workspaceSlug: string) => ["projects", workspaceSlug] as const,
    lite: (workspaceSlug: string) => ["projects", workspaceSlug, "lite"] as const,
    detail: (projectId: string) => ["projects", "detail", projectId] as const,
    analytics: (workspaceSlug: string) => ["projects", workspaceSlug, "analytics"] as const,
  },

  issues: {
    all: (workspaceSlug: string, projectId: string) => ["issues", workspaceSlug, projectId] as const,
    detail: (issueId: string) => ["issues", "detail", issueId] as const,
  },
};
```

### Query Hooks Pattern

**File:** `/apps/web/core/store/queries/project.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectService } from "@/services/project/project.service";
import { queryKeys } from "./query-keys";

const projectService = new ProjectService();

/**
 * Hook to fetch all projects for a workspace.
 * Replaces MobX ProjectStore.fetchProjects.
 */
export function useProjects(workspaceSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.all(workspaceSlug ?? ""),
    queryFn: () => projectService.getProjects(workspaceSlug!),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to create a new project with optimistic updates.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, data }) => projectService.createProject(workspaceSlug, data),
    onSuccess: (newProject, { workspaceSlug }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.all(workspaceSlug),
      });
    },
  });
}
```

### Backward-Compatible Hooks

**File:** `/apps/web/core/hooks/store/use-project.ts`

```typescript
/**
 * Backward-compatible hook that wraps TanStack Query.
 * Provides the same API as the old MobX ProjectStore.
 *
 * @deprecated Prefer using individual hooks (useProjects, useProjectDetails) directly.
 */
export function useProject() {
  const params = useParams<{ workspaceSlug?: string; projectId?: string }>();
  const workspaceSlug = params?.workspaceSlug ?? "";
  const projectId = params?.projectId ?? "";

  const { data: projects } = useProjects(workspaceSlug);
  const { data: currentProjectDetails } = useProjectDetails(workspaceSlug, projectId);

  // Helper functions matching the old MobX API
  const getProjectById = (id: string | null | undefined) => {
    return getProjectByIdUtil(projects, id);
  };

  const workspaceProjectIds = getProjectIds(projects);

  return {
    currentProjectDetails,
    getProjectById,
    workspaceProjectIds,
  };
}
```

## TypeScript Patterns

### State and Actions Separation

```typescript
// State interface (data)
interface MyState {
  count: number;
  items: string[];
}

// Actions interface (methods)
interface MyActions {
  increment: () => void;
  addItem: (item: string) => void;
}

// Combined store type
export type MyStore = MyState & MyActions;
```

### Type Exports

```typescript
// Store implementation
export const useMyStore = create<MyStore>()((set) => ({ ... }));

// Export types for consumers
export type { MyStore, MyState, MyActions };

// Legacy interface for backward compatibility
export interface IMyStore extends MyStore {}
```

## Best Practices

### 1. State Management Boundaries

**Use Zustand for:**

- UI state (sidebar collapsed, modal open, selected items)
- Filter state (sort, group, search queries)
- Theme preferences
- Client-only computed values
- Ephemeral state (not persisted to server)

**Use TanStack Query for:**

- Server data (projects, issues, users)
- API calls (fetching, mutations)
- Server-side caching
- Optimistic updates
- Request deduplication

### 2. Store Organization

```
client/
├── theme.store.ts              # UI theme/layout state
├── router.store.ts             # URL params (read-only)
├── command-palette.store.ts    # Command palette state
├── sprint-filter.store.ts      # Sprint filters
├── epic-filter.store.ts        # Epic filters
└── index.ts                    # Re-export all stores
```

**Naming:**

- `{domain}.store.ts` - Single domain store
- `{domain}-{feature}.store.ts` - Feature-specific store
- Use descriptive names that indicate purpose

### 3. Performance Optimization

```tsx
// ❌ BAD - Re-renders on any state change
const store = useMyStore();

// ✅ GOOD - Only re-renders when sidebarCollapsed changes
const sidebarCollapsed = useMyStore((state) => state.sidebarCollapsed);

// ✅ GOOD - Subscribe to multiple fields
const { count, name } = useMyStore((state) => ({
  count: state.count,
  name: state.name,
}));
```

### 4. Async Actions

```typescript
// Async actions return promises
fetchData: async () => {
  set({ isLoading: true });
  try {
    const data = await apiCall();
    set({ data, isLoading: false });
  } catch (error) {
    set({ error, isLoading: false });
  }
};
```

### 5. Store Initialization

```typescript
// Initialize on module load (not in constructor)
if (typeof window !== "undefined") {
  useMyStore.getState().loadFromLocalStorage();
}
```

### 6. External Updates (getState/setState)

```typescript
// Outside React components
import { useMyStore } from "./my-store";

// Read state
const currentCount = useMyStore.getState().count;

// Update state
useMyStore.setState({ count: 10 });

// Call actions
useMyStore.getState().increment();
```

## Migration Checklist

When migrating from MobX to Zustand:

- [ ] Create Zustand store with same interface as MobX store
- [ ] Move state properties to store state
- [ ] Convert MobX `@action` methods to store actions
- [ ] Convert MobX `@computed` to getter functions
- [ ] Add persistence if needed (`persist` middleware or manual)
- [ ] Create legacy class wrapper for backward compatibility
- [ ] Update root.store.ts to use legacy wrapper
- [ ] Test all component usages
- [ ] Add deprecation warnings to legacy APIs
- [ ] Gradually migrate components to direct Zustand hooks
- [ ] Remove legacy wrappers once all components migrated

## Common Patterns

### Router Store (URL Params)

```typescript
// Stores URL params from Next.js router
export const useRouterStore = create<RouterStoreType>()((set) => ({
  query: {},
  setQuery: (query: ParsedUrlQuery) => set({ query }),
}));

// Computed values from query params
const getQueryValue = (query: ParsedUrlQuery, key: string): string | undefined => {
  const value = query[key];
  return value?.toString();
};
```

### Command Palette Store

```typescript
export const useCommandPaletteStore = create<CommandPaletteStore>()((set) => ({
  isOpen: false,
  toggleOpen: (open) =>
    set((state) => ({
      isOpen: open ?? !state.isOpen,
    })),
}));
```

### Multiple Select Store

```typescript
export const useMultipleSelectStore = create<MultipleSelectStore>()((set) => ({
  selectedIssues: new Set<string>(),
  addIssue: (issueId) =>
    set((state) => ({
      selectedIssues: new Set([...state.selectedIssues, issueId]),
    })),
  removeIssue: (issueId) =>
    set((state) => {
      const newSet = new Set(state.selectedIssues);
      newSet.delete(issueId);
      return { selectedIssues: newSet };
    }),
  clearAll: () => set({ selectedIssues: new Set() }),
}));
```

## Dependencies

**Required packages:**

```json
{
  "dependencies": {
    "zustand": "^5.0.9",
    "@tanstack/react-query": "^5.90.12"
  }
}
```

## References

- Web app stores: `/apps/web/core/store/client/`
- Admin app stores: `/apps/admin/core/store/`
- Space app stores: `/apps/space/core/store/`
- TanStack Query hooks: `/apps/{app}/core/store/queries/`
- Store hooks: `/apps/{app}/core/hooks/store/`

---

**Note:** All three frontend apps (web, admin, space) have completed the migration from MobX to TanStack Query + Zustand. The live app is a Node.js server and does not use client-side state management.
