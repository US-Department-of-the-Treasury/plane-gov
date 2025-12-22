import { useParams } from "next/navigation";
import { useMemo } from "react";
// zustand store
import { useEpicFilterStore } from "@/store/client";
import type { TEpicDisplayFilters, TEpicFilters } from "@plane/types";

export interface IEpicFilterStore {
  // State
  displayFilters: Record<string, TEpicDisplayFilters>;
  filters: Record<string, any>;
  searchQuery: string;
  archivedEpicsSearchQuery: string;
  // Computed (for current project based on router)
  currentProjectDisplayFilters: TEpicDisplayFilters | undefined;
  currentProjectFilters: TEpicFilters | undefined;
  currentProjectArchivedFilters: TEpicFilters | undefined;
  // Getters (for specific projectId)
  getDisplayFiltersByProjectId: (projectId: string) => TEpicDisplayFilters | undefined;
  getFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  getArchivedFiltersByProjectId: (projectId: string) => TEpicFilters | undefined;
  // Actions
  initProjectEpicFilters: (projectId: string) => void;
  updateDisplayFilters: (projectId: string, displayFilters: TEpicDisplayFilters) => void;
  updateFilters: (projectId: string, filters: TEpicFilters, state?: "default" | "archived") => void;
  updateSearchQuery: (query: string) => void;
  updateArchivedEpicsSearchQuery: (query: string) => void;
  clearAllFilters: (projectId: string, state?: "default" | "archived") => void;
}

export const useEpicFilter = (): IEpicFilterStore => {
  const { projectId } = useParams();
  const store = useEpicFilterStore();

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
    archivedEpicsSearchQuery: store.archivedEpicsSearchQuery,
    // Computed (current project)
    currentProjectDisplayFilters,
    currentProjectFilters,
    currentProjectArchivedFilters,
    // Getters
    getDisplayFiltersByProjectId: store.getDisplayFiltersByProjectId,
    getFiltersByProjectId: store.getFiltersByProjectId,
    getArchivedFiltersByProjectId: store.getArchivedFiltersByProjectId,
    // Actions
    initProjectEpicFilters: store.initProjectEpicFilters,
    updateDisplayFilters: store.updateDisplayFilters,
    updateFilters: store.updateFilters,
    updateSearchQuery: store.updateSearchQuery,
    updateArchivedEpicsSearchQuery: store.updateArchivedEpicsSearchQuery,
    clearAllFilters: store.clearAllFilters,
  };
};
