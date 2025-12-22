import { useParams } from "next/navigation";
import { useMemo } from "react";
// zustand store
import { useProjectFilterStore } from "@/store/client";
import type { TProjectDisplayFilters, TProjectFilters, TProjectAppliedDisplayFilterKeys } from "@plane/types";
import { shouldFilterProject, orderProjects } from "@plane/utils";
import { useProjects, getProjectIds } from "@/store/queries/project";

export interface IProjectFilterStore {
  // State
  displayFilters: Record<string, TProjectDisplayFilters>;
  filters: Record<string, TProjectFilters>;
  searchQuery: string;
  // Computed (for current workspace based on router)
  currentWorkspaceDisplayFilters: TProjectDisplayFilters | undefined;
  currentWorkspaceAppliedDisplayFilters: TProjectAppliedDisplayFilterKeys[] | undefined;
  currentWorkspaceFilters: TProjectFilters | undefined;
  filteredProjectIds: string[] | undefined;
  // Getters (for specific workspaceSlug)
  getDisplayFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectDisplayFilters | undefined;
  getFiltersByWorkspaceSlug: (workspaceSlug: string) => TProjectFilters | undefined;
  // Actions
  initWorkspaceFilters: (workspaceSlug: string) => void;
  updateDisplayFilters: (workspaceSlug: string, displayFilters: TProjectDisplayFilters) => void;
  updateFilters: (workspaceSlug: string, filters: TProjectFilters) => void;
  updateSearchQuery: (query: string) => void;
  clearAllFilters: (workspaceSlug: string) => void;
  clearAllAppliedDisplayFilters: (workspaceSlug: string) => void;
}

export const useProjectFilter = (): IProjectFilterStore => {
  const { workspaceSlug } = useParams();
  const store = useProjectFilterStore();
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");

  // Compute current workspace values based on router workspaceSlug
  const currentWorkspaceDisplayFilters = useMemo(() => {
    if (!workspaceSlug || typeof workspaceSlug !== "string") return undefined;
    return store.getCurrentWorkspaceDisplayFilters(workspaceSlug);
  }, [workspaceSlug, store.displayFilters]);

  const currentWorkspaceAppliedDisplayFilters = useMemo(() => {
    if (!workspaceSlug || typeof workspaceSlug !== "string") return undefined;
    return store.getCurrentWorkspaceAppliedDisplayFilters(workspaceSlug);
  }, [workspaceSlug, store.displayFilters]);

  const currentWorkspaceFilters = useMemo(() => {
    if (!workspaceSlug || typeof workspaceSlug !== "string") return undefined;
    return store.getCurrentWorkspaceFilters(workspaceSlug);
  }, [workspaceSlug, store.filters]);

  // Compute filtered project IDs based on current filters and display filters
  const filteredProjectIds = useMemo(() => {
    if (!workspaceSlug || typeof workspaceSlug !== "string" || !projects) return undefined;

    const filters = currentWorkspaceFilters ?? {};
    const displayFilters = currentWorkspaceDisplayFilters ?? {};
    const searchQuery = store.searchQuery;

    // Filter projects based on filters, display filters, and search query
    let filteredProjects = projects.filter((project) => {
      // Apply search query filter
      if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Apply filters using utility function
      return shouldFilterProject(project, displayFilters, filters);
    });

    // Order filtered projects
    filteredProjects = orderProjects(filteredProjects, displayFilters.order_by);

    return filteredProjects.map((p) => p.id);
  }, [workspaceSlug, projects, currentWorkspaceFilters, currentWorkspaceDisplayFilters, store.searchQuery]);

  return {
    // State
    displayFilters: store.displayFilters,
    filters: store.filters,
    searchQuery: store.searchQuery,
    // Computed (current workspace)
    currentWorkspaceDisplayFilters,
    currentWorkspaceAppliedDisplayFilters,
    currentWorkspaceFilters,
    filteredProjectIds,
    // Getters
    getDisplayFiltersByWorkspaceSlug: store.getDisplayFiltersByWorkspaceSlug,
    getFiltersByWorkspaceSlug: store.getFiltersByWorkspaceSlug,
    // Actions
    initWorkspaceFilters: store.initWorkspaceFilters,
    updateDisplayFilters: store.updateDisplayFilters,
    updateFilters: store.updateFilters,
    updateSearchQuery: store.updateSearchQuery,
    clearAllFilters: store.clearAllFilters,
    clearAllAppliedDisplayFilters: store.clearAllAppliedDisplayFilters,
  };
};
