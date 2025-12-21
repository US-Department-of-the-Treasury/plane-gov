import { update, concat, set, sortBy } from "lodash-es";
import { action, computed, observable, makeObservable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { IEpic, ILinkDetails, TEpicPlotType } from "@plane/types";
import type { DistributionUpdates } from "@plane/utils";
import { updateDistribution, orderEpics, shouldFilterEpic } from "@plane/utils";
// helpers
// services
import { EpicService } from "@/services/epic.service";
import { EpicArchiveService } from "@/services/epic_archive.service";
import { ProjectService } from "@/services/project";
// store
import type { CoreRootStore } from "./root.store";

export interface IEpicStore {
  //Loaders
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  plotType: Record<string, TEpicPlotType>;
  // observables
  epicMap: Record<string, IEpic>;
  // computed
  projectEpicIds: string[] | null;
  projectArchivedEpicIds: string[] | null;
  // computed actions
  getEpicsFetchStatusByProjectId: (projectId: string) => boolean;
  getFilteredEpicIds: (projectId: string) => string[] | null;
  getFilteredArchivedEpicIds: (projectId: string) => string[] | null;
  getEpicById: (epicId: string) => IEpic | null;
  getEpicNameById: (epicId: string) => string;
  getProjectEpicDetails: (projectId: string) => IEpic[] | null;
  getProjectEpicIds: (projectId: string) => string[] | null;
  getPlotTypeByEpicId: (epicId: string) => TEpicPlotType;
  // actions
  setPlotType: (epicId: string, plotType: TEpicPlotType) => void;
  // fetch
  updateEpicDistribution: (distributionUpdates: DistributionUpdates, epicId: string) => void;
  fetchWorkspaceEpics: (workspaceSlug: string) => Promise<IEpic[]>;
  fetchEpics: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchEpicsSlim: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchArchivedEpics: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchArchivedEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) => Promise<IEpic>;
  fetchEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) => Promise<IEpic>;
  // crud
  createEpic: (workspaceSlug: string, projectId: string, data: Partial<IEpic>) => Promise<IEpic>;
  updateEpicDetails: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<IEpic>
  ) => Promise<IEpic>;
  deleteEpic: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  createEpicLink: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<ILinkDetails>
  ) => Promise<ILinkDetails>;
  updateEpicLink: (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    linkId: string,
    data: Partial<ILinkDetails>
  ) => Promise<ILinkDetails>;
  deleteEpicLink: (workspaceSlug: string, projectId: string, epicId: string, linkId: string) => Promise<void>;
  // favorites
  addEpicToFavorites: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  removeEpicFromFavorites: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  // archive
  archiveEpic: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  restoreEpic: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
}

export class EpicsStore implements IEpicStore {
  // observables
  loader: boolean = false;
  epicMap: Record<string, IEpic> = {};
  plotType: Record<string, TEpicPlotType> = {};
  //loaders
  fetchedMap: Record<string, boolean> = {};
  // root store
  rootStore;
  // services
  projectService;
  epicService;
  epicArchiveService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      epicMap: observable,
      plotType: observable.ref,
      fetchedMap: observable,
      // computed
      projectEpicIds: computed,
      projectArchivedEpicIds: computed,
      // actions
      setPlotType: action,
      fetchWorkspaceEpics: action,
      fetchEpics: action,
      fetchArchivedEpics: action,
      fetchArchivedEpicDetails: action,
      fetchEpicDetails: action,
      createEpic: action,
      updateEpicDetails: action,
      deleteEpic: action,
      createEpicLink: action,
      updateEpicLink: action,
      deleteEpicLink: action,
      addEpicToFavorites: action,
      removeEpicFromFavorites: action,
      archiveEpic: action,
      restoreEpic: action,
    });

    this.rootStore = _rootStore;

    // services
    this.projectService = new ProjectService();
    this.epicService = new EpicService();
    this.epicArchiveService = new EpicArchiveService();
  }

  // computed
  /**
   * get all module ids for the current project
   */
  get projectEpicIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let projectModules = Object.values(this.epicMap).filter((m) => m.project_id === projectId && !m?.archived_at);
    projectModules = sortBy(projectModules, [(m) => m.sort_order]);
    const projectEpicIds = projectModules.map((m) => m.id);
    return projectEpicIds || null;
  }

  /**
   * get all archived module ids for the current project
   */
  get projectArchivedEpicIds() {
    const projectId = this.rootStore.router.projectId;
    if (!projectId || !this.fetchedMap[projectId]) return null;
    let archivedModules = Object.values(this.epicMap).filter((m) => m.project_id === projectId && !!m?.archived_at);
    archivedModules = sortBy(archivedModules, [(m) => m.sort_order]);
    const projectEpicIds = archivedModules.map((m) => m.id);
    return projectEpicIds || null;
  }

  /**
   * Returns the fetch status for a specific project
   * @param projectId
   * @returns boolean
   */
  getEpicsFetchStatusByProjectId = computedFn((projectId: string) => this.fetchedMap[projectId] ?? false);

  /**
   * @description returns filtered module ids based on display filters and filters
   * @param {TEpicDisplayFilters} displayFilters
   * @param {TEpicFilters} filters
   * @returns {string[] | null}
   */
  getFilteredEpicIds = computedFn((projectId: string) => {
    const displayFilters = this.rootStore.epicFilter.getDisplayFiltersByProjectId(projectId);
    const filters = this.rootStore.epicFilter.getFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.epicFilter.searchQuery;
    if (!this.fetchedMap[projectId]) return null;
    let modules = Object.values(this.epicMap ?? {}).filter(
      (m) =>
        m.project_id === projectId &&
        !m.archived_at &&
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterEpic(m, displayFilters ?? {}, filters ?? {})
    );
    modules = orderEpics(epics, displayFilters?.order_by);
    const epicIds = modules.map((m) => m.id);
    return epicIds;
  });

  /**
   * @description returns filtered archived module ids based on display filters and filters
   * @param {string} projectId
   * @returns {string[] | null}
   */
  getFilteredArchivedEpicIds = computedFn((projectId: string) => {
    const displayFilters = this.rootStore.epicFilter.getDisplayFiltersByProjectId(projectId);
    const filters = this.rootStore.epicFilter.getArchivedFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.epicFilter.archivedEpicsSearchQuery;
    if (!this.fetchedMap[projectId]) return null;
    let modules = Object.values(this.epicMap ?? {}).filter(
      (m) =>
        m.project_id === projectId &&
        !!m.archived_at &&
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterEpic(m, displayFilters ?? {}, filters ?? {})
    );
    modules = orderEpics(epics, displayFilters?.order_by);
    const epicIds = modules.map((m) => m.id);
    return epicIds;
  });

  /**
   * @description get module by id
   * @param epicId
   * @returns IEpic | null
   */
  getEpicById = computedFn((epicId: string) => this.epicMap?.[epicId] || null);

  /**
   * @description get module by id
   * @param epicId
   * @returns IEpic | null
   */
  getEpicNameById = computedFn((epicId: string) => this.epicMap?.[epicId]?.name);

  /**
   * @description returns list of module details of the project id passed as argument
   * @param projectId
   */
  getProjectEpicDetails = computedFn((projectId: string) => {
    if (!this.fetchedMap[projectId]) return null;
    let projectModules = Object.values(this.epicMap).filter((m) => m.project_id === projectId && !m.archived_at);
    projectModules = sortBy(projectModules, [(m) => m.sort_order]);
    return projectModules;
  });

  /**
   * @description returns list of module ids of the project id passed as argument
   * @param projectId
   */
  getProjectEpicIds = computedFn((projectId: string) => {
    const projectModules = this.getProjectEpicDetails(projectId);
    if (!projectModules) return null;
    const projectEpicIds = projectModules.map((m) => m.id);
    return projectEpicIds;
  });

  /**
   * @description gets the plot type for the epic.store
   * @param {TEpicPlotType} plotType
   */
  getPlotTypeByEpicId = (epicId: string) => {
    const { projectId } = this.rootStore.router;

    return projectId && this.rootStore.projectEstimate.areEstimateEnabledByProjectId(projectId)
      ? this.plotType[epicId] || "burndown"
      : "burndown";
  };

  /**
   * @description updates the plot type for the epic.store
   * @param {TEpicPlotType} plotType
   */
  setPlotType = (epicId: string, plotType: TEpicPlotType) => {
    set(this.plotType, [epicId], plotType);
  };

  /**
   * @description fetch all modules
   * @param workspaceSlug
   * @returns IEpic[]
   */
  fetchWorkspaceEpics = async (workspaceSlug: string) =>
    await this.epicService.getWorkspaceModules(workspaceSlug).then((response) => {
      runInAction(() => {
        response.forEach((epic) => {
          set(this.epicMap, [module.id], { ...this.epicMap[module.id], ...module });
        });
        // check for all unique project ids and update the fetchedMap
        const uniqueProjectIds = new Set(response.map((epic) => module.project_id));
        uniqueProjectIds.forEach((projectId) => {
          set(this.fetchedMap, projectId, true);
        });
      });
      return response;
    });

  /**
   * @description fetch all modules
   * @param workspaceSlug
   * @param projectId
   * @returns IEpic[]
   */
  fetchEpics = async (workspaceSlug: string, projectId: string) => {
    try {
      this.loader = true;
      await this.epicService.getModules(workspaceSlug, projectId).then((response) => {
        runInAction(() => {
          response.forEach((epic) => {
            set(this.epicMap, [module.id], { ...this.epicMap[module.id], ...module });
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
   * @description fetch all modules
   * @param workspaceSlug
   * @param projectId
   * @returns IEpic[]
   */
  fetchEpicsSlim = async (workspaceSlug: string, projectId: string) => {
    try {
      this.loader = true;
      await this.epicService.getWorkspaceModules(workspaceSlug).then((response) => {
        const projectModules = response.filter((epic) => module.project_id === projectId);
        runInAction(() => {
          projectModules.forEach((epic) => {
            set(this.epicMap, [module.id], { ...this.epicMap[module.id], ...module });
          });
          set(this.fetchedMap, projectId, true);
          this.loader = false;
        });
        return projectModules;
      });
    } catch {
      this.loader = false;
      return undefined;
    }
  };

  /**
   * @description fetch all archived modules
   * @param workspaceSlug
   * @param projectId
   * @returns IEpic[]
   */
  fetchArchivedEpics = async (workspaceSlug: string, projectId: string) => {
    this.loader = true;
    return await this.epicArchiveService
      .getArchivedModules(workspaceSlug, projectId)
      .then((response) => {
        runInAction(() => {
          response.forEach((epic) => {
            set(this.epicMap, [module.id], { ...this.epicMap[module.id], ...module });
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
   * @description fetch module details
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns IEpic
   */
  fetchArchivedEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string) =>
    await this.epicArchiveService.getArchivedModuleDetails(workspaceSlug, projectId, epicId).then((response) => {
      runInAction(() => {
        set(this.epicMap, [response.id], { ...this.epicMap?.[response.id], ...response });
      });
      return response;
    });

  /**
   * This method updates the module's stats locally without fetching the updated stats from backend
   * @param distributionUpdates
   * @param epicId
   * @returns
   */
  updateEpicDistribution = (distributionUpdates: DistributionUpdates, epicId: string) => {
    const moduleInfo = this.epicMap[epicId];

    if (!moduleInfo) return;

    runInAction(() => {
      updateDistribution(moduleInfo, distributionUpdates);
    });
  };

  /**
   * @description fetch module details
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns IEpic
   */
  fetchEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string) =>
    await this.epicService.getModuleDetails(workspaceSlug, projectId, epicId).then((response) => {
      runInAction(() => {
        set(this.epicMap, [epicId], response);
      });
      return response;
    });

  /**
   * @description creates a new module
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @returns IEpic
   */
  createEpic = async (workspaceSlug: string, projectId: string, data: Partial<IEpic>) =>
    await this.epicService.createEpic(workspaceSlug, projectId, data).then((response) => {
      runInAction(() => {
        set(this.epicMap, [response?.id], response);
      });
      return response;
    });

  /**
   * @description updates module details
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @param data
   * @returns IEpic
   */
  updateEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string, data: Partial<IEpic>) => {
    const originalModuleDetails = this.getEpicById(epicId);
    try {
      runInAction(() => {
        set(this.epicMap, [epicId], { ...originalModuleDetails, ...data });
      });
      const response = await this.epicService.patchModule(workspaceSlug, projectId, epicId, data);
      return response;
    } catch (error) {
      console.error("Failed to update module in epic.store", error);
      runInAction(() => {
        set(this.epicMap, [epicId], { ...originalModuleDetails });
      });
      throw error;
    }
  };

  /**
   * @description deletes a module
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   */
  deleteEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const epicDetails = this.getEpicById(epicId);
    if (!epicDetails) return;
    await this.epicService.deleteEpic(workspaceSlug, projectId, epicId).then(() => {
      runInAction(() => {
        delete this.epicMap[epicId];
        if (this.rootStore.favorite.entityMap[epicId]) this.rootStore.favorite.removeFavoriteFromStore(epicId);
      });
    });
  };

  /**
   * @description creates a new module link
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @param data
   * @returns ILinkDetails
   */
  createEpicLink = async (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    data: Partial<ILinkDetails>
  ) => {
    try {
      const epicLink = await this.epicService.createEpicLink(workspaceSlug, projectId, epicId, data);
      runInAction(() => {
        update(this.epicMap, [epicId, "link_epic"], (epicLinks = []) => concat(epicLinks, epicLink));
      });
      return epicLink;
    } catch (error) {
      throw error;
    }
  };

  /**
   * @description updates epic link details
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @param linkId
   * @param data
   * @returns ILinkDetails
   */
  updateEpicLink = async (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    linkId: string,
    data: Partial<ILinkDetails>
  ) => {
    const originalEpicDetails = this.getEpicById(epicId);
    try {
      const epicLinks = originalEpicDetails?.link_epic?.map((link) =>
        link.id === linkId ? { ...link, ...data } : link
      );
      runInAction(() => {
        set(this.epicMap, [epicId, "link_epic"], epicLinks);
      });
      const response = await this.epicService.updateEpicLink(workspaceSlug, projectId, epicId, linkId, data);
      return response;
    } catch (error) {
      console.error("Failed to update epic link in epic.store", error);
      runInAction(() => {
        set(this.epicMap, [epicId, "link_epic"], originalEpicDetails?.link_epic);
      });
      throw error;
    }
  };

  /**
   * @description deletes an epic link
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @param linkId
   */
  deleteEpicLink = async (workspaceSlug: string, projectId: string, epicId: string, linkId: string) => {
    try {
      const epicLink = await this.epicService.deleteEpicLink(workspaceSlug, projectId, epicId, linkId);
      runInAction(() => {
        update(this.epicMap, [epicId, "link_epic"], (epicLinks = []) =>
          epicLinks.filter((link: ILinkDetails) => link.id !== linkId)
        );
      });
      return epicLink;
    } catch (error) {
      throw error;
    }
  };

  /**
   * @description adds a module to favorites
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns
   */
  addEpicToFavorites = async (workspaceSlug: string, projectId: string, epicId: string) => {
    try {
      const epicDetails = this.getEpicById(epicId);
      if (epicDetails?.is_favorite) return;
      runInAction(() => {
        set(this.epicMap, [epicId, "is_favorite"], true);
      });
      await this.rootStore.favorite.addFavorite(workspaceSlug.toString(), {
        entity_type: "epic",
        entity_identifier: epicId,
        project_id: projectId,
        entity_data: { name: this.epicMap[epicId].name || "" },
      });
    } catch (error) {
      console.error("Failed to add module to favorites in epic.store", error);
      runInAction(() => {
        set(this.epicMap, [epicId, "is_favorite"], false);
      });
    }
  };

  /**
   * @description removes a module from favorites
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns
   */
  removeEpicFromFavorites = async (workspaceSlug: string, projectId: string, epicId: string) => {
    try {
      const epicDetails = this.getEpicById(epicId);
      if (!epicDetails?.is_favorite) return;
      runInAction(() => {
        set(this.epicMap, [epicId, "is_favorite"], false);
      });
      await this.rootStore.favorite.removeFavoriteEntity(workspaceSlug, epicId);
    } catch (error) {
      console.error("Failed to remove module from favorites in epic.store", error);
      runInAction(() => {
        set(this.epicMap, [epicId, "is_favorite"], true);
      });
    }
  };

  /**
   * @description archives a module
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns
   */
  archiveEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const epicDetails = this.getEpicById(epicId);
    if (epicDetails?.archived_at) return;
    await this.epicArchiveService
      .archiveEpic(workspaceSlug, projectId, epicId)
      .then((response) => {
        runInAction(() => {
          set(this.epicMap, [epicId, "archived_at"], response.archived_at);
          if (this.rootStore.favorite.entityMap[epicId]) this.rootStore.favorite.removeFavoriteFromStore(epicId);
        });
      })
      .catch((error) => {
        console.error("Failed to archive module in epic.store", error);
      });
  };

  /**
   * @description restores a module
   * @param workspaceSlug
   * @param projectId
   * @param epicId
   * @returns
   */
  restoreEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const epicDetails = this.getEpicById(epicId);
    if (!epicDetails?.archived_at) return;
    await this.epicArchiveService
      .restoreEpic(workspaceSlug, projectId, epicId)
      .then(() => {
        runInAction(() => {
          set(this.epicMap, [epicId, "archived_at"], null);
        });
      })
      .catch((error) => {
        console.error("Failed to restore module in epic.store", error);
      });
  };
}
