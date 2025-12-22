import { useParams } from "next/navigation";
import { useMemo } from "react";
// zustand store
import { useSprintFilterStore } from "@/store/client";
import type { TSprintDisplayFilters, TSprintFilters } from "@plane/types";

export interface ISprintFilterStore {
  // State
  displayFilters: Record<string, TSprintDisplayFilters>;
  filters: Record<string, any>;
  searchQuery: string;
  archivedSprintsSearchQuery: string;
  // Computed (for current project based on router)
  currentProjectDisplayFilters: TSprintDisplayFilters | undefined;
  currentProjectFilters: TSprintFilters | undefined;
  currentProjectArchivedFilters: TSprintFilters | undefined;
  // Getters (for specific projectId)
  getDisplayFiltersByProjectId: (projectId: string) => TSprintDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TSprintFilters | undefined;
  // Actions
  initProjectSprintFilters: (projectId: string) => void;
  updateDisplayFilters: (projectId: string, displayFilters: TSprintDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TSprintFilters, state?: "default" | "archived") => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedSprintsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: "default" | "archived") => void;
}

export const useSprintFilter = (): ISprintFilterStore => {
  const { projectId } = useParams();
  const store = useSprintFilterStore();

  // Compute current project values based on router projectId
  const currentProjectDisplayFilters = useMemo(() => {
    if (!projectId || typeof projectId !== "string") return undefined;
    return store.getCurrentProjectDisplayFilters(projectId);
  }, [projectId, store.displayFilters]);

  const currentProjectFilters = useMemo(() => {
    if (!projectId || typeof projectId !== "string") return undefined;
    return store.getCurrentProjectFilters(projectId);
  }, [projectId, store.filters]);

  const currentProjectArchivedFilters = useMemo(() => {
    if (!projectId || typeof projectId !== "string") return undefined;
    return store.getCurrentProjectArchivedFilters(projectId);
  }, [projectId, store.filters]);

  return {
    // State
    displayFilters: store.displayFilters,
    filters: store.filters,
    searchQuery: store.searchQuery,
    archivedSprintsSearchQuery: store.archivedSprintsSearchQuery,
    // Computed (current project)
    currentProjectDisplayFilters,
    currentProjectFilters,
    currentProjectArchivedFilters,
    // Getters
    getDisplayFiltersByProjectId: store.getDisplayFiltersByProjectId,
    getFiltersByProjectId: store.getFiltersByProjectId,
    getArchivedFiltersByProjectId: store.getArchivedFiltersByProjectId,
    // Actions
    initProjectSprintFilters: store.initProjectSprintFilters,
    updateDisplayFilters: store.updateDisplayFilters,
    updateFilters: store.updateFilters,
    updateSearchQuery: store.updateSearchQuery,
    updateArchivedSprintsSearchQuery: store.updateArchivedSprintsSearchQuery,
    clearAllFilters: store.clearAllFilters,
  };
};
