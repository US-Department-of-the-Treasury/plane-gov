import { isPast, isToday } from "date-fns";
import { sortBy, set, isEmpty } from "lodash-es";
import { action, computed, observable, makeObservable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type {
  ISprint,
  TSprintPlotType,
  TProgressSnapshot,
  TSprintEstimateDistribution,
  TSprintDistribution,
  TSprintEstimateType,
} from "@plane/types";
import type { DistributionUpdates } from "@plane/utils";
import { orderSprints, shouldFilterSprint, getDate, updateDistribution } from "@plane/utils";
// helpers
// services
import { SprintService } from "@/services/sprint.service";
import { SprintArchiveService } from "@/services/sprint_archive.service";
import { IssueService } from "@/services/issue";
import { ProjectService } from "@/services/project";
// store
import type { CoreRootStore } from "./root.store";

export interface ISprintStore {
  // loaders
  loader: boolean;
  progressLoader: boolean;
  // observables
  fetchedMap: Record<string, boolean>;
  sprintMap: Record<string, ISprint>;
  plotType: Record<string, TSprintPlotType>;
  estimatedType: Record<string, TSprintEstimateType>;
  activeSprintIdMap: Record<string, boolean>;

  // computed
  currentProjectSprintIds: string[] | null;
  currentProjectCompletedSprintIds: string[] | null;
  currentProjectIncompleteSprintIds: string[] | null;
  currentProjectActiveSprintId: string | null;
  currentProjectArchivedSprintIds: string[] | null;
  currentProjectActiveSprint: ISprint | null;

  // computed actions
  getFilteredSprintIds: (projectId: string, sortByManual: boolean) => string[] | null;
  getFilteredCompletedSprintIds: (projectId: string) => string[] | null;
  getFilteredArchivedSprintIds: (projectId: string) => string[] | null;
  getSprintById: (sprintId: string) => ISprint | null;
  getSprintNameById: (sprintId: string) => string | undefined;
  getProjectSprintDetails: (projectId: string) => ISprint[] | null;
  getProjectSprintIds: (projectId: string) => string[] | null;
  getPlotTypeBySprintId: (sprintId: string) => TSprintPlotType;
  getEstimateTypeBySprintId: (sprintId: string) => TSprintEstimateType;
  getIsPointsDataAvailable: (sprintId: string) => boolean;

  // actions
  updateSprintDistribution: (distributionUpdates: DistributionUpdates, sprintId: string) => void;
  setPlotType: (sprintId: string, plotType: TSprintPlotType) => void;
  setEstimateType: (sprintId: string, estimateType: TSprintEstimateType) => void;
  // fetch
  fetchWorkspaceSprints: (workspaceSlug: string) => Promise<ISprint[]>;
  fetchAllSprints: (workspaceSlug: string, projectId: string) => Promise<undefined | ISprint[]>;
  fetchActiveSprint: (workspaceSlug: string, projectId: string) => Promise<undefined | ISprint[]>;
  fetchArchivedSprints: (workspaceSlug: string, projectId: string) => Promise<undefined | ISprint[]>;
  fetchArchivedSprintDetails: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<ISprint>;
  fetchSprintDetails: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<ISprint>;
  fetchActiveSprintProgress: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<TProgressSnapshot>;
  fetchActiveSprintProgressPro: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
  fetchActiveSprintAnalytics: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    analytic_type: string
  ) => Promise<TSprintDistribution | TSprintEstimateDistribution>;
  // crud
  createSprint: (workspaceSlug: string, projectId: string, data: Partial<ISprint>) => Promise<ISprint>;
  updateSprintDetails: (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    data: Partial<ISprint>
  ) => Promise<ISprint>;
  deleteSprint: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
  // favorites
  addSprintToFavorites: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<any>;
  removeSprintFromFavorites: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
  // archive
  archiveSprint: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
  restoreSprint: (workspaceSlug: string, projectId: string, sprintId: string) => Promise<void>;
}

export class SprintStore implements ISprintStore {
  // observables
  loader: boolean = false;
  progressLoader: boolean = false;
  sprintMap: Record<string, ISprint> = {};
  plotType: Record<string, TSprintPlotType> = {};
  estimatedType: Record<string, TSprintEstimateType> = {};
  activeSprintIdMap: Record<string, boolean> = {};
  //loaders
  fetchedMap: Record<string, boolean> = {};
  // root store
  rootStore;
  // services
  projectService;
  issueService;
  sprintService;
  sprintArchiveService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      progressLoader: observable,
      sprintMap: observable,
      plotType: observable,
      estimatedType: observable,
      activeSprintIdMap: observable,
      fetchedMap: observable,
      // computed
      currentProjectSprintIds: computed,
      currentProjectCompletedSprintIds: computed,
      currentProjectIncompleteSprintIds: computed,
      currentProjectActiveSprintId: computed,
      currentProjectArchivedSprintIds: computed,
      currentProjectActiveSprint: computed,

      // actions
      setEstimateType: action,
      fetchWorkspaceSprints: action,
      fetchAllSprints: action,
      fetchActiveSprint: action,
      fetchArchivedSprints: action,
      fetchArchivedSprintDetails: action,
      fetchActiveSprintProgress: action,
      fetchActiveSprintAnalytics: action,
      fetchSprintDetails: action,
      updateSprintDetails: action,
      deleteSprint: action,
      addSprintToFavorites: action,
      removeSprintFromFavorites: action,
      archiveSprint: action,
      restoreSprint: action,
    });

    this.rootStore = _rootStore;

    // services
    this.projectService = new ProjectService();
    this.issueService = new IssueService();
    this.sprintService = new SprintService();
    this.sprintArchiveService = new SprintArchiveService();
  }

  // computed
  /**
   * returns all sprint ids for a project
   */
  get currentProjectSprintIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let allSprints = Object.values(this.sprintMap ?? {}).filter((c) => c?.project_id === projectId && !c?.archived_at);
    allSprints = sortBy(allSprints, [(c) => c.sort_order]);
    const allSprintIds = allSprints.map((c) => c.id);
    return allSprintIds;
  }

  /**
   * returns all completed sprint ids for a project
   */
  get currentProjectCompletedSprintIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let completedSprints = Object.values(this.sprintMap ?? {}).filter((c) => {
      const endDate = getDate(c.end_date);
      const hasEndDatePassed = endDate && isPast(endDate);
      const isEndDateToday = endDate && isToday(endDate);
      return (
        c.project_id === projectId && ((hasEndDatePassed && !isEndDateToday) || c.status?.toLowerCase() === "completed")
      );
    });
    completedSprints = sortBy(completedSprints, [(c) => c.sort_order]);
    const completedSprintIds = completedSprints.map((c) => c.id);
    return completedSprintIds;
  }

  /**
   * returns all incomplete sprint ids for a project
   */
  get currentProjectIncompleteSprintIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let incompleteSprints = Object.values(this.sprintMap ?? {}).filter((c) => {
      const endDate = getDate(c.end_date);
      const hasEndDatePassed = endDate && isPast(endDate);
      return (
        c.project_id === projectId && !hasEndDatePassed && !c?.archived_at && c.status?.toLowerCase() !== "completed"
      );
    });
    incompleteSprints = sortBy(incompleteSprints, [(c) => c.sort_order]);
    const incompleteSprintIds = incompleteSprints.map((c) => c.id);
    return incompleteSprintIds;
  }

  /**
   * returns active sprint id for a project
   */
  get currentProjectActiveSprintId() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId) return null;
    const activeSprint = Object.keys(this.sprintMap ?? {}).find(
      (sprintId) =>
        this.sprintMap?.[sprintId]?.project_id === projectId &&
        this.sprintMap?.[sprintId]?.status?.toLowerCase() === "current"
    );
    return activeSprint || null;
  }

  /**
   * returns all archived sprint ids for a project
   */
  get currentProjectArchivedSprintIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let archivedSprints = Object.values(this.sprintMap ?? {}).filter(
      (c) => c.project_id === projectId && !!c.archived_at
    );
    archivedSprints = sortBy(archivedSprints, [(c) => c.sort_order]);
    const archivedSprintIds = archivedSprints.map((c) => c.id);
    return archivedSprintIds;
  }

  get currentProjectActiveSprint() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId && !this.currentProjectActiveSprintId) return null;
    return this.sprintMap?.[this.currentProjectActiveSprintId!] ?? null;
  }

  getIsPointsDataAvailable = computedFn((sprintId: string) => {
    const sprint = this.getSprintById(sprintId);
    if (!sprint) return false;
    if (sprint.version === 2) return sprint.progress?.some((p) => p.total_estimate_points > 0);
    else if (sprint.version === 1) {
      const completionChart = sprint.estimate_distribution?.completion_chart || {};
      return !isEmpty(completionChart) && Object.keys(completionChart).some((p) => completionChart[p]! > 0);
    } else return false;
  });

  /**
   * @description returns filtered sprint ids based on display filters and filters
   * @param {TSprintDisplayFilters} displayFilters
   * @param {TSprintFilters} filters
   * @returns {string[] | null}
   */
  getFilteredSprintIds = computedFn((projectId: string, sortByManual: boolean) => {
    const filters = this.rootStore.sprintFilter.getFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.sprintFilter.searchQuery;
    if (!this.fetchedMap[projectId]) return null;
    let sprints = Object.values(this.sprintMap ?? {}).filter(
      (c) =>
        c.project_id === projectId &&
        !c.archived_at &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterSprint(c, filters ?? {})
    );
    sprints = orderSprints(sprints, sortByManual);
    const sprintIds = sprints.map((c) => c.id);
    return sprintIds;
  });

  /**
   * @description returns filtered sprint ids based on display filters and filters
   * @param {TSprintDisplayFilters} displayFilters
   * @param {TSprintFilters} filters
   * @returns {string[] | null}
   */
  getFilteredCompletedSprintIds = computedFn((projectId: string) => {
    const filters = this.rootStore.sprintFilter.getFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.sprintFilter.searchQuery;
    if (!this.fetchedMap[projectId]) return null;
    let sprints = Object.values(this.sprintMap ?? {}).filter(
      (c) =>
        c.project_id === projectId &&
        !c.archived_at &&
        c.status?.toLowerCase() === "completed" &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterSprint(c, filters ?? {})
    );
    sprints = sortBy(sprints, [(c) => !c.start_date]);
    const sprintIds = sprints.map((c) => c.id);
    return sprintIds;
  });

  /**
   * @description returns filtered archived sprint ids based on display filters and filters
   * @param {string} projectId
   * @returns {string[] | null}
   */
  getFilteredArchivedSprintIds = computedFn((projectId: string) => {
    const filters = this.rootStore.sprintFilter.getArchivedFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.sprintFilter.archivedSprintsSearchQuery;
    if (!this.fetchedMap[projectId]) return null;
    let sprints = Object.values(this.sprintMap ?? {}).filter(
      (c) =>
        c.project_id === projectId &&
        !!c.archived_at &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterSprint(c, filters ?? {})
    );
    sprints = sortBy(sprints, [(c) => !c.start_date]);
    const sprintIds = sprints.map((c) => c.id);
    return sprintIds;
  });

  /**
   * @description returns sprint details by sprint id
   * @param sprintId
   * @returns
   */
  getSprintById = computedFn((sprintId: string): ISprint | null => this.sprintMap?.[sprintId] ?? null);

  /**
   * @description returns sprint name by sprint id
   * @param sprintId
   * @returns
   */
  getSprintNameById = computedFn((sprintId: string): string => this.sprintMap?.[sprintId]?.name);

  /**
   * @description returns list of sprint details of the project id passed as argument
   * @param projectId
   */
  getProjectSprintDetails = computedFn((projectId: string): ISprint[] | null => {
    if (!this.fetchedMap[projectId]) return null;

    let sprints = Object.values(this.sprintMap ?? {}).filter((c) => c.project_id === projectId && !c?.archived_at);
    sprints = sortBy(sprints, [(c) => c.sort_order]);
    return sprints || null;
  });

  /**
   * @description returns list of sprint ids of the project id passed as argument
   * @param projectId
   */
  getProjectSprintIds = computedFn((projectId: string): string[] | null => {
    const sprints = this.getProjectSprintDetails(projectId);
    if (!sprints) return null;
    const sprintIds = sprints.map((c) => c.id);
    return sprintIds || null;
  });

  /**
   * @description gets the plot type for the sprint store
   * @param {TSprintPlotType} plotType
   */
  getPlotTypeBySprintId = computedFn((sprintId: string) => this.plotType[sprintId] || "burndown");

  /**
   * @description gets the estimate type for the sprint store
   * @param {TSprintEstimateType} estimateType
   */
  getEstimateTypeBySprintId = computedFn((sprintId: string) => {
    const { projectId } = this.rootStore.router;

    return projectId && this.rootStore.projectEstimate.areEstimateEnabledByProjectId(projectId)
      ? this.estimatedType[sprintId] || "issues"
      : "issues";
  });

  /**
   * @description updates the plot type for the sprint store
   * @param {TSprintPlotType} plotType
   */
  setPlotType = (sprintId: string, plotType: TSprintPlotType) => {
    set(this.plotType, [sprintId], plotType);
  };

  /**
   * @description updates the estimate type for the sprint store
   * @param {TSprintEstimateType} estimateType
   */
  setEstimateType = (sprintId: string, estimateType: TSprintEstimateType) => {
    set(this.estimatedType, [sprintId], estimateType);
  };

  /**
   * @description fetch all sprints
   * @param workspaceSlug
   * @returns ISprint[]
   */
  fetchWorkspaceSprints = async (workspaceSlug: string) =>
    await this.sprintService.getWorkspaceSprints(workspaceSlug).then((response) => {
      runInAction(() => {
        response.forEach((sprint) => {
          set(this.sprintMap, [sprint.id], { ...this.sprintMap[sprint.id], ...sprint });
          set(this.fetchedMap, sprint.project_id, true);
        });
      });
      return response;
    });

  /**
   * @description fetches all sprints for a project
   * @param workspaceSlug
   * @param projectId
   * @returns
   */
  fetchAllSprints = async (workspaceSlug: string, projectId: string) => {
    try {
      this.loader = true;
      await this.sprintService.getSprintsWithParams(workspaceSlug, projectId).then((response) => {
        runInAction(() => {
          response.forEach((sprint) => {
            set(this.sprintMap, [sprint.id], sprint);
            if (sprint.status?.toLowerCase() === "current") {
              set(this.activeSprintIdMap, [sprint.id], true);
            }
          });
          set(this.fetchedMap, projectId, true);
          this.loader = false;
        });
        return response;
      });
    } catch {
      this.loader = false;
      return undefined;
    }
  };

  /**
   * @description fetches archived sprints for a project
   * @param workspaceSlug
   * @param projectId
   * @returns
   */
  fetchArchivedSprints = async (workspaceSlug: string, projectId: string) => {
    this.loader = true;
    return await this.sprintArchiveService
      .getArchivedSprints(workspaceSlug, projectId)
      .then((response) => {
        runInAction(() => {
          response.forEach((sprint) => {
            set(this.sprintMap, [sprint.id], sprint);
          });
          this.loader = false;
        });
        return response;
      })
      .catch(() => {
        this.loader = false;
        return undefined;
      });
  };

  /**
   * @description fetches active sprint for a project
   * @param workspaceSlug
   * @param projectId
   * @returns
   */
  fetchActiveSprint = async (workspaceSlug: string, projectId: string) =>
    await this.sprintService.getSprintsWithParams(workspaceSlug, projectId, "current").then((response) => {
      runInAction(() => {
        response.forEach((sprint) => {
          set(this.activeSprintIdMap, [sprint.id], true);
          set(this.sprintMap, [sprint.id], sprint);
        });
      });
      return response;
    });

  /**
   * @description fetches active sprint progress
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   *  @returns
   */
  fetchActiveSprintProgress = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    this.progressLoader = true;
    return await this.sprintService.workspaceActiveSprintsProgress(workspaceSlug, projectId, sprintId).then((progress) => {
      runInAction(() => {
        set(this.sprintMap, [sprintId], { ...this.sprintMap[sprintId], ...progress });
        this.progressLoader = false;
      });
      return progress;
    });
  };

  /**
   * @description fetches active sprint progress for pro users
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   *  @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchActiveSprintProgressPro = action(async (workspaceSlug: string, projectId: string, sprintId: string) => {});

  /**
   * @description fetches active sprint analytics
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   *  @returns
   */
  fetchActiveSprintAnalytics = async (
    workspaceSlug: string,
    projectId: string,
    sprintId: string,
    analytic_type: string
  ) =>
    await this.sprintService
      .workspaceActiveSprintsAnalytics(workspaceSlug, projectId, sprintId, analytic_type)
      .then((sprint) => {
        runInAction(() => {
          set(this.sprintMap, [sprintId, analytic_type === "points" ? "estimate_distribution" : "distribution"], sprint);
        });
        return sprint;
      });

  /**
   * @description fetches sprint details
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  fetchArchivedSprintDetails = async (workspaceSlug: string, projectId: string, sprintId: string) =>
    await this.sprintArchiveService.getArchivedSprintDetails(workspaceSlug, projectId, sprintId).then((response) => {
      runInAction(() => {
        set(this.sprintMap, [response.id], { ...this.sprintMap?.[response.id], ...response });
      });
      return response;
    });

  /**
   * @description fetches sprint details
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  fetchSprintDetails = async (workspaceSlug: string, projectId: string, sprintId: string) =>
    await this.sprintService.getSprintDetails(workspaceSlug, projectId, sprintId).then((response) => {
      runInAction(() => {
        set(this.sprintMap, [response.id], { ...this.sprintMap?.[response.id], ...response });
      });
      return response;
    });

  /**
   * This method updates the sprint's stats locally without fetching the updated stats from backend
   * @param distributionUpdates
   * @param sprintId
   * @returns
   */
  updateSprintDistribution = (distributionUpdates: DistributionUpdates, sprintId: string) => {
    const sprint = this.getSprintById(sprintId);
    if (!sprint) return;

    runInAction(() => {
      updateDistribution(sprint, distributionUpdates);
    });
  };

  /**
   * @description creates a new sprint
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @returns
   */
  createSprint = action(
    async (workspaceSlug: string, projectId: string, data: Partial<ISprint>) =>
      await this.sprintService.createSprint(workspaceSlug, projectId, data).then((response) => {
        runInAction(() => {
          set(this.sprintMap, [response.id], response);
        });
        return response;
      })
  );

  /**
   * @description updates sprint details
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @param data
   * @returns
   */
  updateSprintDetails = async (workspaceSlug: string, projectId: string, sprintId: string, data: Partial<ISprint>) => {
    try {
      runInAction(() => {
        set(this.sprintMap, [sprintId], { ...this.sprintMap?.[sprintId], ...data });
      });
      const response = await this.sprintService.patchSprint(workspaceSlug, projectId, sprintId, data);
      this.fetchSprintDetails(workspaceSlug, projectId, sprintId);
      return response;
    } catch (error) {
      console.log("Failed to patch sprint from sprint store");
      this.fetchAllSprints(workspaceSlug, projectId);
      this.fetchActiveSprint(workspaceSlug, projectId);
      throw error;
    }
  };

  /**
   * @description deletes a sprint
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   */
  deleteSprint = async (workspaceSlug: string, projectId: string, sprintId: string) =>
    await this.sprintService.deleteSprint(workspaceSlug, projectId, sprintId).then(() => {
      runInAction(() => {
        delete this.sprintMap[sprintId];
        delete this.activeSprintIdMap[sprintId];
        if (this.rootStore.favorite.entityMap[sprintId]) this.rootStore.favorite.removeFavoriteFromStore(sprintId);
      });
    });

  /**
   * @description adds a sprint to favorites
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  addSprintToFavorites = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    const currentSprint = this.getSprintById(sprintId);
    try {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], true);
      });
      // updating through api.
      const response = await this.rootStore.favorite.addFavorite(workspaceSlug.toString(), {
        entity_type: "sprint",
        entity_identifier: sprintId,
        project_id: projectId,
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
   * @description removes a sprint from favorites
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  removeSprintFromFavorites = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    const currentSprint = this.getSprintById(sprintId);
    try {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], false);
      });
      const response = await this.rootStore.favorite.removeFavoriteEntity(workspaceSlug, sprintId);
      return response;
    } catch (error) {
      runInAction(() => {
        if (currentSprint) set(this.sprintMap, [sprintId, "is_favorite"], true);
      });
      throw error;
    }
  };

  /**
   * @description archives a sprint
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  archiveSprint = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    const sprintDetails = this.getSprintById(sprintId);
    if (sprintDetails?.archived_at) return;
    await this.sprintArchiveService
      .archiveSprint(workspaceSlug, projectId, sprintId)
      .then((response) => {
        runInAction(() => {
          set(this.sprintMap, [sprintId, "archived_at"], response.archived_at);
          if (this.rootStore.favorite.entityMap[sprintId]) this.rootStore.favorite.removeFavoriteFromStore(sprintId);
        });
      })
      .catch((error) => {
        console.error("Failed to archive sprint in sprint store", error);
      });
  };

  /**
   * @description restores a sprint
   * @param workspaceSlug
   * @param projectId
   * @param sprintId
   * @returns
   */
  restoreSprint = async (workspaceSlug: string, projectId: string, sprintId: string) => {
    const sprintDetails = this.getSprintById(sprintId);
    if (!sprintDetails?.archived_at) return;
    await this.sprintArchiveService
      .restoreSprint(workspaceSlug, projectId, sprintId)
      .then(() => {
        runInAction(() => {
          set(this.sprintMap, [sprintId, "archived_at"], null);
        });
      })
      .catch((error) => {
        console.error("Failed to restore sprint in sprint store", error);
      });
  };
}
