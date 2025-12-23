import { create } from "zustand";
import { sortBy, concat } from "lodash-es";
import type { IEpic, ILinkDetails, TEpicPlotType } from "@plane/types";
import type { DistributionUpdates } from "@plane/utils";
import { updateDistribution, orderEpics, shouldFilterEpic } from "@plane/utils";
import { EpicService } from "@/services/epic.service";
import { EpicArchiveService } from "@/services/epic_archive.service";

/**
 * Epic state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access and imperative operations.
 */
interface EpicStoreState {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  plotType: Record<string, TEpicPlotType>;
  epicMap: Record<string, IEpic>;
}

interface EpicStoreActions {
  // Sync actions
  setLoader: (loader: boolean) => void;
  setFetched: (projectId: string, fetched: boolean) => void;
  setPlotType: (epicId: string, plotType: TEpicPlotType) => void;
  syncEpic: (epic: IEpic) => void;
  syncEpics: (epics: IEpic[], projectId?: string) => void;
  removeEpic: (epicId: string) => void;
  updateEpicField: <K extends keyof IEpic>(epicId: string, field: K, value: IEpic[K]) => void;
  // Getters
  getEpicById: (epicId: string) => IEpic | null;
  getEpicNameById: (epicId: string) => string;
  getProjectEpicIds: (projectId: string | null) => string[] | null;
  getProjectArchivedEpicIds: (projectId: string | null) => string[] | null;
  getProjectEpicDetails: (projectId: string) => IEpic[] | null;
  getEpicsFetchStatusByProjectId: (projectId: string) => boolean;
}

export type EpicStore = EpicStoreState & EpicStoreActions;

const initialState: EpicStoreState = {
  loader: false,
  fetchedMap: {},
  plotType: {},
  epicMap: {},
};

export const useEpicStore = create<EpicStore>()((set, get) => ({
  ...initialState,

  setLoader: (loader) => {
    set({ loader });
  },

  setFetched: (projectId, fetched) => {
    set((state) => ({
      fetchedMap: { ...state.fetchedMap, [projectId]: fetched },
    }));
  },

  setPlotType: (epicId, plotType) => {
    set((state) => ({
      plotType: { ...state.plotType, [epicId]: plotType },
    }));
  },

  syncEpic: (epic) => {
    set((state) => ({
      epicMap: { ...state.epicMap, [epic.id]: { ...state.epicMap[epic.id], ...epic } },
    }));
  },

  syncEpics: (epics, projectId) => {
    set((state) => {
      const newEpicMap = { ...state.epicMap };
      const uniqueProjectIds = new Set<string>();
      epics.forEach((epic) => {
        newEpicMap[epic.id] = { ...newEpicMap[epic.id], ...epic };
        uniqueProjectIds.add(epic.project_id);
      });
      const newFetchedMap = { ...state.fetchedMap };
      if (projectId) {
        newFetchedMap[projectId] = true;
      } else {
        uniqueProjectIds.forEach((pid) => {
          newFetchedMap[pid] = true;
        });
      }
      return { epicMap: newEpicMap, fetchedMap: newFetchedMap };
    });
  },

  removeEpic: (epicId) => {
    set((state) => {
      const newEpicMap = { ...state.epicMap };
      delete newEpicMap[epicId];
      return { epicMap: newEpicMap };
    });
  },

  updateEpicField: (epicId, field, value) => {
    set((state) => {
      if (!state.epicMap[epicId]) return state;
      return {
        epicMap: {
          ...state.epicMap,
          [epicId]: { ...state.epicMap[epicId], [field]: value },
        },
      };
    });
  },

  getEpicById: (epicId) => {
    return get().epicMap?.[epicId] || null;
  },

  getEpicNameById: (epicId) => {
    return get().epicMap?.[epicId]?.name || "";
  },

  getProjectEpicIds: (projectId) => {
    if (!projectId) return null;
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let projectEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !m?.archived_at);
    projectEpics = sortBy(projectEpics, [(m) => m.sort_order]);
    return projectEpics.map((m) => m.id) || null;
  },

  getProjectArchivedEpicIds: (projectId) => {
    if (!projectId) return null;
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let archivedEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !!m?.archived_at);
    archivedEpics = sortBy(archivedEpics, [(m) => m.sort_order]);
    return archivedEpics.map((m) => m.id) || null;
  },

  getProjectEpicDetails: (projectId) => {
    const { epicMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return null;
    let projectEpics = Object.values(epicMap).filter((m) => m.project_id === projectId && !m.archived_at);
    projectEpics = sortBy(projectEpics, [(m) => m.sort_order]);
    return projectEpics;
  },

  getEpicsFetchStatusByProjectId: (projectId) => {
    return get().fetchedMap[projectId] ?? false;
  },
}));

// Service instances for legacy wrapper
const epicService = new EpicService();
const epicArchiveService = new EpicArchiveService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IEpicStore {
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  plotType: Record<string, TEpicPlotType>;
  epicMap: Record<string, IEpic>;
  projectEpicIds: string[] | null;
  projectArchivedEpicIds: string[] | null;
  getEpicsFetchStatusByProjectId: (projectId: string) => boolean;
  getFilteredEpicIds: (projectId: string) => string[] | null;
  getFilteredArchivedEpicIds: (projectId: string) => string[] | null;
  getEpicById: (epicId: string) => IEpic | null;
  getEpicNameById: (epicId: string) => string;
  getProjectEpicDetails: (projectId: string) => IEpic[] | null;
  getProjectEpicIds: (projectId: string) => string[] | null;
  getPlotTypeByEpicId: (epicId: string) => TEpicPlotType;
  setPlotType: (epicId: string, plotType: TEpicPlotType) => void;
  updateEpicDistribution: (distributionUpdates: DistributionUpdates, epicId: string) => void;
  fetchWorkspaceEpics: (workspaceSlug: string) => Promise<IEpic[]>;
  fetchEpics: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchEpicsSlim: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchArchivedEpics: (workspaceSlug: string, projectId: string) => Promise<undefined | IEpic[]>;
  fetchArchivedEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) => Promise<IEpic>;
  fetchEpicDetails: (workspaceSlug: string, projectId: string, epicId: string) => Promise<IEpic>;
  createEpic: (workspaceSlug: string, projectId: string, data: Partial<IEpic>) => Promise<IEpic>;
  updateEpicDetails: (workspaceSlug: string, projectId: string, epicId: string, data: Partial<IEpic>) => Promise<IEpic>;
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
  addEpicToFavorites: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  removeEpicFromFavorites: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  archiveEpic: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
  restoreEpic: (workspaceSlug: string, projectId: string, epicId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks directly in React components
 */
export class EpicStoreLegacy implements IEpicStore {
  private rootStore: {
    router: { projectId: string | null };
    epicFilter: {
      getDisplayFiltersByProjectId: (projectId: string) => any;
      getFiltersByProjectId: (projectId: string) => any;
      getArchivedFiltersByProjectId: (projectId: string) => any;
      searchQuery: string;
      archivedEpicsSearchQuery: string;
    };
    projectEstimate: { areEstimateEnabledByProjectId: (projectId: string) => boolean };
    favorite: {
      entityMap: Record<string, any>;
      addFavorite: (workspaceSlug: string, data: any) => Promise<any>;
      removeFavoriteEntity: (workspaceSlug: string, entityId: string) => Promise<void>;
      removeFavoriteFromStore: (entityId: string) => void;
    };
  };

  constructor(rootStore: any) {
    this.rootStore = rootStore;
  }

  get loader() {
    return useEpicStore.getState().loader;
  }

  get fetchedMap() {
    return useEpicStore.getState().fetchedMap;
  }

  get plotType() {
    return useEpicStore.getState().plotType;
  }

  get epicMap() {
    return useEpicStore.getState().epicMap;
  }

  get projectEpicIds() {
    const projectId = this.rootStore.router.projectId;
    return useEpicStore.getState().getProjectEpicIds(projectId);
  }

  get projectArchivedEpicIds() {
    const projectId = this.rootStore.router.projectId;
    return useEpicStore.getState().getProjectArchivedEpicIds(projectId);
  }

  getEpicsFetchStatusByProjectId = (projectId: string) => {
    return useEpicStore.getState().getEpicsFetchStatusByProjectId(projectId);
  };

  getFilteredEpicIds = (projectId: string) => {
    const { epicMap, fetchedMap } = useEpicStore.getState();
    const displayFilters = this.rootStore.epicFilter.getDisplayFiltersByProjectId(projectId);
    const filters = this.rootStore.epicFilter.getFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.epicFilter.searchQuery;
    if (!fetchedMap[projectId]) return null;
    let epics = Object.values(epicMap ?? {}).filter(
      (m) =>
        m.project_id === projectId &&
        !m.archived_at &&
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterEpic(m, displayFilters ?? {}, filters ?? {})
    );
    epics = orderEpics(epics, displayFilters?.order_by);
    return epics.map((m) => m.id);
  };

  getFilteredArchivedEpicIds = (projectId: string) => {
    const { epicMap, fetchedMap } = useEpicStore.getState();
    const displayFilters = this.rootStore.epicFilter.getDisplayFiltersByProjectId(projectId);
    const filters = this.rootStore.epicFilter.getArchivedFiltersByProjectId(projectId);
    const searchQuery = this.rootStore.epicFilter.archivedEpicsSearchQuery;
    if (!fetchedMap[projectId]) return null;
    let epics = Object.values(epicMap ?? {}).filter(
      (m) =>
        m.project_id === projectId &&
        !!m.archived_at &&
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        shouldFilterEpic(m, displayFilters ?? {}, filters ?? {})
    );
    epics = orderEpics(epics, displayFilters?.order_by);
    return epics.map((m) => m.id);
  };

  getEpicById = (epicId: string) => {
    return useEpicStore.getState().getEpicById(epicId);
  };

  getEpicNameById = (epicId: string) => {
    return useEpicStore.getState().getEpicNameById(epicId);
  };

  getProjectEpicDetails = (projectId: string) => {
    return useEpicStore.getState().getProjectEpicDetails(projectId);
  };

  getProjectEpicIds = (projectId: string) => {
    return useEpicStore.getState().getProjectEpicIds(projectId);
  };

  getPlotTypeByEpicId = (epicId: string) => {
    const { projectId } = this.rootStore.router;
    const { plotType } = useEpicStore.getState();
    return projectId && this.rootStore.projectEstimate.areEstimateEnabledByProjectId(projectId)
      ? plotType[epicId] || "burndown"
      : "burndown";
  };

  setPlotType = (epicId: string, plotType: TEpicPlotType) => {
    useEpicStore.getState().setPlotType(epicId, plotType);
  };

  updateEpicDistribution = (distributionUpdates: DistributionUpdates, epicId: string) => {
    const { epicMap, syncEpic } = useEpicStore.getState();
    const epicInfo = epicMap[epicId];
    if (!epicInfo) return;
    const updatedEpic = { ...epicInfo };
    updateDistribution(updatedEpic, distributionUpdates);
    syncEpic(updatedEpic);
  };

  fetchWorkspaceEpics = async (workspaceSlug: string) => {
    const response = await epicService.getWorkspaceEpics(workspaceSlug);
    useEpicStore.getState().syncEpics(response);
    return response;
  };

  fetchEpics = async (workspaceSlug: string, projectId: string) => {
    const { setLoader, syncEpics } = useEpicStore.getState();
    try {
      setLoader(true);
      const response = await epicService.getEpics(workspaceSlug, projectId);
      syncEpics(response, projectId);
      setLoader(false);
      return response;
    } catch {
      setLoader(false);
      return undefined;
    }
  };

  fetchEpicsSlim = async (workspaceSlug: string, projectId: string) => {
    const { setLoader, syncEpics } = useEpicStore.getState();
    try {
      setLoader(true);
      const response = await epicService.getWorkspaceEpics(workspaceSlug);
      const projectEpics = response.filter((epic) => epic.project_id === projectId);
      syncEpics(projectEpics, projectId);
      setLoader(false);
      return projectEpics;
    } catch {
      setLoader(false);
      return undefined;
    }
  };

  fetchArchivedEpics = async (workspaceSlug: string, projectId: string) => {
    const { setLoader, syncEpics } = useEpicStore.getState();
    setLoader(true);
    try {
      const response = await epicArchiveService.getArchivedEpics(workspaceSlug, projectId);
      syncEpics(response);
      setLoader(false);
      return response;
    } catch {
      setLoader(false);
      return undefined;
    }
  };

  fetchArchivedEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const response = await epicArchiveService.getArchivedEpicDetails(workspaceSlug, projectId, epicId);
    useEpicStore.getState().syncEpic(response);
    return response;
  };

  fetchEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const response = await epicService.getEpicDetails(workspaceSlug, projectId, epicId);
    useEpicStore.getState().syncEpic(response);
    return response;
  };

  createEpic = async (workspaceSlug: string, projectId: string, data: Partial<IEpic>) => {
    const response = await epicService.createEpic(workspaceSlug, projectId, data);
    useEpicStore.getState().syncEpic(response);
    return response;
  };

  updateEpicDetails = async (workspaceSlug: string, projectId: string, epicId: string, data: Partial<IEpic>) => {
    const { syncEpic, getEpicById } = useEpicStore.getState();
    const originalEpicDetails = getEpicById(epicId);
    try {
      if (originalEpicDetails) {
        syncEpic({ ...originalEpicDetails, ...data } as IEpic);
      }
      const response = await epicService.patchEpic(workspaceSlug, projectId, epicId, data);
      return response;
    } catch (error) {
      console.error("Failed to update epic in epic.store", error);
      if (originalEpicDetails) {
        syncEpic(originalEpicDetails);
      }
      throw error;
    }
  };

  deleteEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const { getEpicById, removeEpic } = useEpicStore.getState();
    const epicDetails = getEpicById(epicId);
    if (!epicDetails) return;
    await epicService.deleteEpic(workspaceSlug, projectId, epicId);
    removeEpic(epicId);
    if (this.rootStore.favorite.entityMap[epicId]) {
      this.rootStore.favorite.removeFavoriteFromStore(epicId);
    }
  };

  createEpicLink = async (workspaceSlug: string, projectId: string, epicId: string, data: Partial<ILinkDetails>) => {
    const epicLink = await epicService.createEpicLink(workspaceSlug, projectId, epicId, data);
    const { epicMap, syncEpic } = useEpicStore.getState();
    const epic = epicMap[epicId];
    if (epic) {
      syncEpic({ ...epic, link_epic: concat(epic.link_epic || [], epicLink) });
    }
    return epicLink;
  };

  updateEpicLink = async (
    workspaceSlug: string,
    projectId: string,
    epicId: string,
    linkId: string,
    data: Partial<ILinkDetails>
  ) => {
    const { epicMap, syncEpic, getEpicById } = useEpicStore.getState();
    const originalEpicDetails = getEpicById(epicId);
    try {
      const epicLinks = originalEpicDetails?.link_epic?.map((link) =>
        link.id === linkId ? { ...link, ...data } : link
      );
      if (epicMap[epicId]) {
        syncEpic({ ...epicMap[epicId], link_epic: epicLinks });
      }
      const response = await epicService.updateEpicLink(workspaceSlug, projectId, epicId, linkId, data);
      return response;
    } catch (error) {
      console.error("Failed to update epic link in epic.store", error);
      if (originalEpicDetails) {
        syncEpic(originalEpicDetails);
      }
      throw error;
    }
  };

  deleteEpicLink = async (workspaceSlug: string, projectId: string, epicId: string, linkId: string) => {
    const epicLink = await epicService.deleteEpicLink(workspaceSlug, projectId, epicId, linkId);
    const { epicMap, syncEpic } = useEpicStore.getState();
    const epic = epicMap[epicId];
    if (epic) {
      syncEpic({ ...epic, link_epic: (epic.link_epic || []).filter((link: ILinkDetails) => link.id !== linkId) });
    }
    return epicLink;
  };

  addEpicToFavorites = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const { getEpicById, updateEpicField, epicMap } = useEpicStore.getState();
    try {
      const epicDetails = getEpicById(epicId);
      if (epicDetails?.is_favorite) return;
      updateEpicField(epicId, "is_favorite", true);
      await this.rootStore.favorite.addFavorite(workspaceSlug.toString(), {
        entity_type: "epic",
        entity_identifier: epicId,
        project_id: projectId,
        entity_data: { name: epicMap[epicId].name || "" },
      });
    } catch (error) {
      console.error("Failed to add epic to favorites in epic.store", error);
      updateEpicField(epicId, "is_favorite", false);
    }
  };

  removeEpicFromFavorites = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const { getEpicById, updateEpicField } = useEpicStore.getState();
    try {
      const epicDetails = getEpicById(epicId);
      if (!epicDetails?.is_favorite) return;
      updateEpicField(epicId, "is_favorite", false);
      await this.rootStore.favorite.removeFavoriteEntity(workspaceSlug, epicId);
    } catch (error) {
      console.error("Failed to remove epic from favorites in epic.store", error);
      updateEpicField(epicId, "is_favorite", true);
    }
  };

  archiveEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const { getEpicById, updateEpicField } = useEpicStore.getState();
    const epicDetails = getEpicById(epicId);
    if (epicDetails?.archived_at) return;
    try {
      const response = await epicArchiveService.archiveEpic(workspaceSlug, projectId, epicId);
      updateEpicField(epicId, "archived_at", response.archived_at);
      if (this.rootStore.favorite.entityMap[epicId]) {
        this.rootStore.favorite.removeFavoriteFromStore(epicId);
      }
    } catch (error) {
      console.error("Failed to archive epic in epic.store", error);
    }
  };

  restoreEpic = async (workspaceSlug: string, projectId: string, epicId: string) => {
    const { getEpicById, updateEpicField } = useEpicStore.getState();
    const epicDetails = getEpicById(epicId);
    if (!epicDetails?.archived_at) return;
    try {
      await epicArchiveService.restoreEpic(workspaceSlug, projectId, epicId);
      updateEpicField(epicId, "archived_at", null as any);
    } catch (error) {
      console.error("Failed to restore epic in epic.store", error);
    }
  };
}
