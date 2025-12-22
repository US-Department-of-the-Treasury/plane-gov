import { isPast, isToday } from "date-fns";
import { sortBy, set } from "lodash-es";
import { action, computed, observable, makeObservable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { ISprint, TSprintPlotType, TSprintEstimateType } from "@plane/types";
import type { DistributionUpdates } from "@plane/utils";
import { orderSprints, shouldFilterSprint, getDate, updateDistribution } from "@plane/utils";
// services
import { SprintService } from "@/services/sprint.service";
// store
import type { CoreRootStore } from "./root.store";

export interface ISprintStore {
  // loaders
  loader: boolean;
  // observables
  fetchedMap: Record<string, boolean>; // keyed by workspaceSlug
  sprintMap: Record<string, ISprint>;
  plotType: Record<string, TSprintPlotType>;
  estimatedType: Record<string, TSprintEstimateType>;

  // computed
  currentWorkspaceSprintIds: string[] | null;
  currentWorkspaceCompletedSprintIds: string[] | null;
  currentWorkspaceActiveSprintId: string | null;
  currentWorkspaceActiveSprint: ISprint | null;

  // computed actions
  getSprintById: (sprintId: string) => ISprint | null;
  getSprintNameById: (sprintId: string) => string | undefined;
  getSprintByNumber: (workspaceId: string, number: number) => ISprint | null;
  getWorkspaceSprintIds: (workspaceId: string) => string[] | null;
  getFilteredSprintIds: (workspaceId: string, sortByManual: boolean) => string[] | null;
  getProjectSprintDetails: (projectId: string) => ISprint[] | undefined;
  getPlotTypeBySprintId: (sprintId: string) => TSprintPlotType;
  getEstimateTypeBySprintId: (sprintId: string) => TSprintEstimateType;

  // actions
  updateSprintDistribution: (distributionUpdates: DistributionUpdates, sprintId: string) => void;
  setPlotType: (sprintId: string, plotType: TSprintPlotType) => void;
  setEstimateType: (sprintId: string, estimateType: TSprintEstimateType) => void;

  // fetch
  fetchWorkspaceSprints: (workspaceSlug: string) => Promise<ISprint[]>;
  fetchSprintDetails: (workspaceSlug: string, sprintId: string) => Promise<ISprint>;

  // crud (limited - sprints are auto-generated)
  updateSprintDetails: (workspaceSlug: string, sprintId: string, data: Partial<ISprint>) => Promise<ISprint>;

  // favorites
  addSprintToFavorites: (workspaceSlug: string, sprintId: string) => Promise<any>;
  removeSprintFromFavorites: (workspaceSlug: string, sprintId: string) => Promise<void>;
}

/**
 * SprintStore for workspace-wide sprints.
 *
 * IMPORTANT: Sprints are now workspace-wide and auto-generated.
 * - Sprints cannot be created or deleted manually
 * - Sprint dates are auto-calculated based on workspace.sprint_start_date
 * - Each sprint is exactly 14 days (2 weeks)
 * - Only name, description, logo_props, view_props, sort_order can be updated
 */
export class SprintStore implements ISprintStore {
  // observables
  loader: boolean = false;
  sprintMap: Record<string, ISprint> = {};
  plotType: Record<string, TSprintPlotType> = {};
  estimatedType: Record<string, TSprintEstimateType> = {};
  fetchedMap: Record<string, boolean> = {};

  // root store
  rootStore;
  // services
  sprintService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      sprintMap: observable,
      plotType: observable,
      estimatedType: observable,
      fetchedMap: observable,
      // computed
      currentWorkspaceSprintIds: computed,
      currentWorkspaceCompletedSprintIds: computed,
      currentWorkspaceActiveSprintId: computed,
      currentWorkspaceActiveSprint: computed,

      // actions
      setEstimateType: action,
      fetchWorkspaceSprints: action,
      fetchSprintDetails: action,
      updateSprintDetails: action,
      addSprintToFavorites: action,
      removeSprintFromFavorites: action,
    });

    this.rootStore = _rootStore;
    this.sprintService = new SprintService();
  }

  // computed

  /**
   * Returns all sprint ids for the current workspace, sorted by number
   */
  get currentWorkspaceSprintIds(): string[] | null {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug || !this.fetchedMap[workspaceSlug]) return null;

    let allSprints = Object.values(this.sprintMap ?? {}).filter((c) => c?.workspace_id && !c?.archived_at);
    allSprints = sortBy(allSprints, [(c) => c.number]);
    return allSprints.map((c) => c.id);
  }

  /**
   * Returns all completed sprint ids for the current workspace
   */
  get currentWorkspaceCompletedSprintIds(): string[] | null {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug || !this.fetchedMap[workspaceSlug]) return null;

    let completedSprints = Object.values(this.sprintMap ?? {}).filter((c) => {
      const endDate = getDate(c.end_date);
      const hasEndDatePassed = endDate && isPast(endDate);
      const isEndDateToday = endDate && isToday(endDate);
      return (hasEndDatePassed && !isEndDateToday) || c.status?.toLowerCase() === "completed";
    });
    completedSprints = sortBy(completedSprints, [(c) => c.number]);
    return completedSprints.map((c) => c.id);
  }

  /**
   * Returns the active (current) sprint id for the workspace
   */
  get currentWorkspaceActiveSprintId(): string | null {
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug) return null;

    const activeSprint = Object.values(this.sprintMap ?? {}).find(
      (sprint) => sprint?.status?.toLowerCase() === "current"
    );
    return activeSprint?.id || null;
  }

  /**
   * Returns the active sprint for the current workspace
   */
  get currentWorkspaceActiveSprint(): ISprint | null {
    const activeId = this.currentWorkspaceActiveSprintId;
    if (!activeId) return null;
    return this.sprintMap?.[activeId] ?? null;
  }

  /**
   * Get sprint by ID
   */
  getSprintById = computedFn((sprintId: string): ISprint | null => this.sprintMap?.[sprintId] ?? null);

  /**
   * Get sprint name by ID
   */
  getSprintNameById = computedFn((sprintId: string): string => this.sprintMap?.[sprintId]?.name);

  /**
   * Get sprint by workspace ID and sprint number
   */
  getSprintByNumber = computedFn((workspaceId: string, number: number): ISprint | null => {
    const sprint = Object.values(this.sprintMap ?? {}).find(
      (s) => s.workspace_id === workspaceId && s.number === number
    );
    return sprint ?? null;
  });

  /**
   * Get all sprint IDs for a workspace
   */
  getWorkspaceSprintIds = computedFn((workspaceId: string): string[] | null => {
    let sprints = Object.values(this.sprintMap ?? {}).filter((c) => c.workspace_id === workspaceId && !c?.archived_at);
    sprints = sortBy(sprints, [(c) => c.number]);
    return sprints.map((c) => c.id);
  });

  /**
   * Get filtered sprint ids based on display filters
   */
  getFilteredSprintIds = computedFn((workspaceId: string, sortByManual: boolean): string[] | null => {
    const filters = this.rootStore.sprintFilter.getFiltersByProjectId(workspaceId);
    const searchQuery = this.rootStore.sprintFilter.searchQuery;

    let sprints = Object.values(this.sprintMap ?? {}).filter(
      (c) =>
        c.workspace_id === workspaceId &&
        !c.archived_at &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterSprint(c, filters ?? {})
    );
    sprints = orderSprints(sprints, sortByManual);
    return sprints.map((c) => c.id);
  });

  /**
   * Get all sprint details for a project (workspace-level sprints)
   * Note: Sprints are now workspace-wide, so this returns all workspace sprints
   */
  getProjectSprintDetails = computedFn((projectId: string): ISprint[] | undefined => {
    // Since sprints are workspace-wide now, we return all workspace sprints
    // The projectId parameter is kept for backward compatibility
    const workspaceSlug = this.rootStore.router.workspaceSlug;
    if (!workspaceSlug || !this.fetchedMap[workspaceSlug]) return undefined;

    let sprints = Object.values(this.sprintMap ?? {}).filter((c) => c?.workspace_id && !c?.archived_at);
    sprints = sortBy(sprints, [(c) => c.number]);
    return sprints;
  });

  /**
   * Get plot type for a sprint
   */
  getPlotTypeBySprintId = computedFn((sprintId: string): TSprintPlotType => this.plotType[sprintId] || "burndown");

  /**
   * Get estimate type for a sprint
   */
  getEstimateTypeBySprintId = computedFn(
    (sprintId: string): TSprintEstimateType => this.estimatedType[sprintId] || "issues"
  );

  /**
   * Set plot type for a sprint
   */
  setPlotType = (sprintId: string, plotType: TSprintPlotType) => {
    set(this.plotType, [sprintId], plotType);
  };

  /**
   * Set estimate type for a sprint
   */
  setEstimateType = (sprintId: string, estimateType: TSprintEstimateType) => {
    set(this.estimatedType, [sprintId], estimateType);
  };

  /**
   * Update sprint distribution locally
   */
  updateSprintDistribution = (distributionUpdates: DistributionUpdates, sprintId: string) => {
    const sprint = this.getSprintById(sprintId);
    if (!sprint) return;

    runInAction(() => {
      updateDistribution(sprint, distributionUpdates);
    });
  };

  /**
   * Fetch all sprints for a workspace.
   * This will auto-generate sprints if workspace.sprint_start_date is set.
   */
  fetchWorkspaceSprints = async (workspaceSlug: string): Promise<ISprint[]> => {
    try {
      this.loader = true;
      const response = await this.sprintService.getWorkspaceSprints(workspaceSlug);

      runInAction(() => {
        response.forEach((sprint) => {
          set(this.sprintMap, [sprint.id], { ...this.sprintMap[sprint.id], ...sprint });
        });
        set(this.fetchedMap, workspaceSlug, true);
        this.loader = false;
      });

      return response;
    } catch (error) {
      runInAction(() => {
        this.loader = false;
      });
      throw error;
    }
  };

  /**
   * Fetch sprint details
   */
  fetchSprintDetails = async (workspaceSlug: string, sprintId: string): Promise<ISprint> => {
    const response = await this.sprintService.getSprintDetails(workspaceSlug, sprintId);

    runInAction(() => {
      set(this.sprintMap, [response.id], { ...this.sprintMap?.[response.id], ...response });
    });

    return response;
  };

  /**
   * Update sprint details.
   * Only name, description, logo_props, view_props, sort_order can be updated.
   */
  updateSprintDetails = async (workspaceSlug: string, sprintId: string, data: Partial<ISprint>): Promise<ISprint> => {
    try {
      // Optimistic update
      runInAction(() => {
        set(this.sprintMap, [sprintId], { ...this.sprintMap?.[sprintId], ...data });
      });

      const response = await this.sprintService.patchSprint(workspaceSlug, sprintId, data);

      // Refresh sprint details
      await this.fetchSprintDetails(workspaceSlug, sprintId);

      return response;
    } catch (error) {
      // Revert on error
      await this.fetchWorkspaceSprints(workspaceSlug);
      throw error;
    }
  };

  /**
   * Add sprint to favorites
   */
  addSprintToFavorites = async (workspaceSlug: string, sprintId: string): Promise<any> => {
    const currentSprint = this.getSprintById(sprintId);
    try {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], true);
      });

      const response = await this.rootStore.favorite.addFavorite(workspaceSlug.toString(), {
        entity_type: "sprint",
        entity_identifier: sprintId,
        entity_data: { name: currentSprint?.name || "" },
      });

      return response;
    } catch (error) {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], false);
      });
      throw error;
    }
  };

  /**
   * Remove sprint from favorites
   */
  removeSprintFromFavorites = async (workspaceSlug: string, sprintId: string): Promise<void> => {
    const currentSprint = this.getSprintById(sprintId);
    try {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], false);
      });

      await this.rootStore.favorite.removeFavoriteEntity(workspaceSlug, sprintId);
    } catch (error) {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], true);
      });
      throw error;
    }
  };
}
