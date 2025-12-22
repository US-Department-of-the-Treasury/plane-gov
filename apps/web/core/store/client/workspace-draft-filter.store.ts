import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  IIssueFilters,
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  TIssueKanbanFilters,
  TWorkItemFilterExpression,
} from "@plane/types";
import { EIssuesStoreType } from "@plane/types";

// Storage key for workspace draft filters
const STORAGE_KEY = "workspace-draft-filters";

type WorkspaceFilters = {
  richFilters?: TWorkItemFilterExpression;
  displayFilters?: IIssueDisplayFilterOptions;
  displayProperties?: IIssueDisplayProperties;
  kanbanFilters?: TIssueKanbanFilters;
};

interface WorkspaceDraftFilterState {
  // Filter state per workspace
  filters: Record<string, WorkspaceFilters>;
}

interface WorkspaceDraftFilterActions {
  // Get filters for a workspace
  getFilters: (workspaceSlug: string) => IIssueFilters | undefined;

  // Update filter expression (rich filters)
  updateFilterExpression: (workspaceSlug: string, filters: TWorkItemFilterExpression) => void;

  // Update display filters
  updateDisplayFilters: (workspaceSlug: string, filters: Partial<IIssueDisplayFilterOptions>) => void;

  // Update display properties
  updateDisplayProperties: (workspaceSlug: string, properties: Partial<IIssueDisplayProperties>) => void;

  // Update kanban filters
  updateKanbanFilters: (workspaceSlug: string, filters: Partial<TIssueKanbanFilters>) => void;

  // Initialize filters for a workspace
  initializeFilters: (
    workspaceSlug: string,
    filters: {
      richFilters?: TWorkItemFilterExpression;
      displayFilters?: IIssueDisplayFilterOptions;
      displayProperties?: IIssueDisplayProperties;
      kanbanFilters?: TIssueKanbanFilters;
    }
  ) => void;

  // Clear filters for a workspace
  clearFilters: (workspaceSlug: string) => void;
}

export type WorkspaceDraftFilterStore = WorkspaceDraftFilterState & WorkspaceDraftFilterActions;

// Helper to read filters from localStorage (for migration compatibility)
function getStoredFilters(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Initial state - reads from existing localStorage for migration compatibility
const getInitialState = (): WorkspaceDraftFilterState => ({
  filters: getStoredFilters() as WorkspaceDraftFilterState["filters"],
});

export const useWorkspaceDraftFilterStore = create<WorkspaceDraftFilterStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      getFilters: (workspaceSlug: string) => {
        const state = get();
        const workspaceFilters = state.filters[workspaceSlug];
        if (!workspaceFilters) return undefined;

        return {
          richFilters: workspaceFilters.richFilters,
          displayFilters: workspaceFilters.displayFilters,
          displayProperties: workspaceFilters.displayProperties,
          kanbanFilters: workspaceFilters.kanbanFilters,
        } as IIssueFilters;
      },

      updateFilterExpression: (workspaceSlug: string, filters: TWorkItemFilterExpression) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [workspaceSlug]: {
              ...state.filters[workspaceSlug],
              richFilters: filters,
            },
          },
        })),

      updateDisplayFilters: (workspaceSlug: string, filters: Partial<IIssueDisplayFilterOptions>) =>
        set((state) => {
          const currentFilters: WorkspaceFilters = state.filters[workspaceSlug] || {};
          const updatedDisplayFilters = { ...currentFilters.displayFilters, ...filters };

          // Handle filter constraints
          // Set sub_group_by to null if group_by is set to null
          if (updatedDisplayFilters.group_by === null) {
            updatedDisplayFilters.sub_group_by = null;
          }

          // Set sub_group_by to null if layout is kanban and group_by and sub_group_by are same
          if (
            updatedDisplayFilters.layout === "kanban" &&
            updatedDisplayFilters.group_by === updatedDisplayFilters.sub_group_by
          ) {
            updatedDisplayFilters.sub_group_by = null;
          }

          // Set group_by to priority if layout is kanban and group_by is null
          if (updatedDisplayFilters.layout === "kanban" && updatedDisplayFilters.group_by === null) {
            updatedDisplayFilters.group_by = "priority";
          }

          return {
            filters: {
              ...state.filters,
              [workspaceSlug]: {
                ...currentFilters,
                displayFilters: updatedDisplayFilters,
              },
            },
          };
        }),

      updateDisplayProperties: (workspaceSlug: string, properties: Partial<IIssueDisplayProperties>) =>
        set((state) => {
          const currentFilters: WorkspaceFilters = state.filters[workspaceSlug] || {};
          const updatedFilters: WorkspaceFilters = {
            ...currentFilters,
            displayProperties: {
              ...currentFilters.displayProperties,
              ...properties,
            },
          };
          return {
            filters: {
              ...state.filters,
              [workspaceSlug]: updatedFilters,
            },
          };
        }),

      updateKanbanFilters: (workspaceSlug: string, filters: Partial<TIssueKanbanFilters>) =>
        set((state) => {
          const currentFilters: WorkspaceFilters = state.filters[workspaceSlug] || {};
          const currentKanbanFilters = currentFilters.kanbanFilters || { group_by: [], sub_group_by: [] };
          const updatedKanbanFilters: TIssueKanbanFilters = {
            ...currentKanbanFilters,
            ...filters,
          };
          const updatedFilters: WorkspaceFilters = {
            ...currentFilters,
            kanbanFilters: updatedKanbanFilters,
          };
          return {
            filters: {
              ...state.filters,
              [workspaceSlug]: updatedFilters,
            },
          };
        }),

      initializeFilters: (workspaceSlug, filters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [workspaceSlug]: {
              richFilters: filters.richFilters,
              displayFilters: filters.displayFilters,
              displayProperties: filters.displayProperties,
              kanbanFilters: filters.kanbanFilters,
            },
          },
        })),

      clearFilters: (workspaceSlug: string) =>
        set((state) => {
          const newFilters = { ...state.filters };
          delete newFilters[workspaceSlug];
          return { filters: newFilters };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the filters state
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);
