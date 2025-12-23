import { sortBy, cloneDeep, update as lodashUpdate, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { TFetchStatus, TLoader, TProjectAnalyticsCount, TProjectAnalyticsCountParams } from "@plane/types";
// helpers
import { orderProjects, shouldFilterProject } from "@plane/utils";
// services
import type { TProject, TPartialProject } from "@/plane-web/types/projects";
import { IssueLabelService, IssueService } from "@/services/issue";
import { ProjectService, ProjectStateService, ProjectArchiveService } from "@/services/project";
// store
import type { CoreRootStore } from "../root.store";

type ProjectOverviewCollapsible = "links" | "attachments" | "milestones";

// Zustand Store
interface ProjectState {
  isUpdatingProject: boolean;
  loader: TLoader;
  fetchStatus: TFetchStatus;
  projectMap: Record<string, TProject>;
  projectAnalyticsCountMap: Record<string, TProjectAnalyticsCount>;
  openCollapsibleSection: ProjectOverviewCollapsible[];
  lastCollapsibleAction: ProjectOverviewCollapsible | null;
}

interface ProjectActions {
  setOpenCollapsibleSection: (section: ProjectOverviewCollapsible[]) => void;
  setLastCollapsibleAction: (section: ProjectOverviewCollapsible) => void;
  toggleOpenCollapsibleSection: (section: ProjectOverviewCollapsible) => void;
  processProjectAfterCreation: (workspaceSlug: string, data: TProject, rootStore: CoreRootStore) => void;
  fetchPartialProjects: (workspaceSlug: string, projectService: ProjectService) => Promise<TPartialProject[]>;
  fetchProjects: (workspaceSlug: string, projectService: ProjectService, workspaceProjectIds: string[] | undefined) => Promise<TProject[]>;
  fetchProjectDetails: (workspaceSlug: string, projectId: string, projectService: ProjectService) => Promise<TProject>;
  fetchProjectAnalyticsCount: (
    workspaceSlug: string,
    params: TProjectAnalyticsCountParams | undefined,
    projectService: ProjectService
  ) => Promise<TProjectAnalyticsCount[]>;
  addProjectToFavorites: (workspaceSlug: string, projectId: string, rootStore: CoreRootStore) => Promise<any>;
  removeProjectFromFavorites: (workspaceSlug: string, projectId: string, rootStore: CoreRootStore) => Promise<any>;
  updateProjectView: (workspaceSlug: string, projectId: string, viewProps: any, projectService: ProjectService) => Promise<any>;
  createProject: (workspaceSlug: string, data: Partial<TProject>, projectService: ProjectService, rootStore: CoreRootStore) => Promise<TProject>;
  updateProject: (workspaceSlug: string, projectId: string, data: Partial<TProject>, projectService: ProjectService) => Promise<TProject>;
  deleteProject: (workspaceSlug: string, projectId: string, projectService: ProjectService, rootStore: CoreRootStore) => Promise<void>;
  archiveProject: (workspaceSlug: string, projectId: string, projectArchiveService: ProjectArchiveService, rootStore: CoreRootStore) => Promise<void>;
  restoreProject: (workspaceSlug: string, projectId: string, projectArchiveService: ProjectArchiveService) => Promise<void>;
}

type ProjectStoreType = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStoreType>()(
  immer((set, get) => ({
    // State
    isUpdatingProject: false,
    loader: "init-loader" as TLoader,
    fetchStatus: undefined,
    projectMap: {},
    projectAnalyticsCountMap: {},
    openCollapsibleSection: ["milestones"],
    lastCollapsibleAction: null,

    // Actions
    setOpenCollapsibleSection: (section: ProjectOverviewCollapsible[]) => {
      set((state) => {
        state.openCollapsibleSection = section;
        if (state.lastCollapsibleAction) state.lastCollapsibleAction = null;
      });
    },

    setLastCollapsibleAction: (section: ProjectOverviewCollapsible) => {
      set((state) => {
        state.openCollapsibleSection = [...state.openCollapsibleSection, section];
      });
    },

    toggleOpenCollapsibleSection: (section: ProjectOverviewCollapsible) => {
      set((state) => {
        if (state.openCollapsibleSection && state.openCollapsibleSection.includes(section)) {
          state.openCollapsibleSection = state.openCollapsibleSection.filter((s) => s !== section);
        } else {
          state.openCollapsibleSection = [...state.openCollapsibleSection, section];
        }
      });
    },

    /**
     * @description process project after creation
     * @param workspaceSlug
     * @param data
     */
    processProjectAfterCreation: (workspaceSlug: string, data: TProject, rootStore: CoreRootStore) => {
      set((state) => {
        lodashSet(state.projectMap, [data.id], data);
      });
      // updating the user project role in workspaceProjectsPermissions
      lodashSet(rootStore.user.permission.workspaceProjectsPermissions, [workspaceSlug, data.id], data.member_role);
    },

    /**
     * get Workspace projects partial data using workspace slug
     * @param workspaceSlug
     * @returns Promise<TPartialProject[]>
     *
     */
    fetchPartialProjects: async (workspaceSlug: string, projectService: ProjectService) => {
      try {
        set((state) => {
          state.loader = "init-loader";
        });
        const projectsResponse = await projectService.getProjectsLite(workspaceSlug);
        set((state) => {
          projectsResponse.forEach((project) => {
            lodashUpdate(state.projectMap, [project.id], (p) => ({ ...p, ...project }));
          });
          state.loader = "loaded";
          if (!state.fetchStatus) state.fetchStatus = "partial";
        });
        return projectsResponse;
      } catch (error) {
        console.log("Failed to fetch project from workspace store");
        set((state) => {
          state.loader = "loaded";
        });
        throw error;
      }
    },

    /**
     * get Workspace projects using workspace slug
     * @param workspaceSlug
     * @returns Promise<TProject[]>
     *
     */
    fetchProjects: async (workspaceSlug: string, projectService: ProjectService, workspaceProjectIds: string[] | undefined) => {
      try {
        set((state) => {
          if (workspaceProjectIds && workspaceProjectIds.length > 0) {
            state.loader = "mutation";
          } else {
            state.loader = "init-loader";
          }
        });
        const projectsResponse = await projectService.getProjects(workspaceSlug);
        set((state) => {
          projectsResponse.forEach((project) => {
            lodashUpdate(state.projectMap, [project.id], (p) => ({ ...p, ...project }));
          });
          state.loader = "loaded";
          state.fetchStatus = "complete";
        });
        return projectsResponse;
      } catch (error) {
        console.log("Failed to fetch project from workspace store");
        set((state) => {
          state.loader = "loaded";
        });
        throw error;
      }
    },

    /**
     * Fetches project details using workspace slug and project id
     * @param workspaceSlug
     * @param projectId
     * @returns Promise<TProject>
     */
    fetchProjectDetails: async (workspaceSlug: string, projectId: string, projectService: ProjectService) => {
      try {
        const response = await projectService.getProject(workspaceSlug, projectId);
        set((state) => {
          lodashUpdate(state.projectMap, [projectId], (p) => ({ ...p, ...response }));
        });
        return response;
      } catch (error) {
        console.log("Error while fetching project details", error);
        throw error;
      }
    },

    /**
     * Fetches project analytics count using workspace slug and project id
     * @param workspaceSlug
     * @param params TProjectAnalyticsCountParams
     * @returns Promise<TProjectAnalyticsCount[]>
     */
    fetchProjectAnalyticsCount: async (
      workspaceSlug: string,
      params: TProjectAnalyticsCountParams | undefined,
      projectService: ProjectService
    ): Promise<TProjectAnalyticsCount[]> => {
      try {
        const response = await projectService.getProjectAnalyticsCount(workspaceSlug, params);
        set((state) => {
          for (const analyticsData of response) {
            lodashSet(state.projectAnalyticsCountMap, [analyticsData.id], analyticsData);
          }
        });
        return response;
      } catch (error) {
        console.log("Failed to fetch project analytics count", error);
        throw error;
      }
    },

    /**
     * Adds project to favorites and updates project favorite status in the store
     * @param workspaceSlug
     * @param projectId
     * @returns
     */
    addProjectToFavorites: async (workspaceSlug: string, projectId: string, rootStore: CoreRootStore) => {
      try {
        const currentProject = get().projectMap[projectId];
        if (currentProject?.is_favorite) return;
        set((state) => {
          lodashSet(state.projectMap, [projectId, "is_favorite"], true);
        });
        const response = await rootStore.favorite.addFavorite(workspaceSlug.toString(), {
          entity_type: "project",
          entity_identifier: projectId,
          project_id: projectId,
          entity_data: { name: get().projectMap[projectId].name || "" },
        });
        return response;
      } catch (error) {
        console.log("Failed to add project to favorite");
        set((state) => {
          lodashSet(state.projectMap, [projectId, "is_favorite"], false);
        });
        throw error;
      }
    },

    /**
     * Removes project from favorites and updates project favorite status in the store
     * @param workspaceSlug
     * @param projectId
     * @returns
     */
    removeProjectFromFavorites: async (workspaceSlug: string, projectId: string, rootStore: CoreRootStore) => {
      try {
        const currentProject = get().projectMap[projectId];
        if (!currentProject?.is_favorite) return;
        set((state) => {
          lodashSet(state.projectMap, [projectId, "is_favorite"], false);
        });
        const response = await rootStore.favorite.removeFavoriteEntity(workspaceSlug.toString(), projectId);

        return response;
      } catch (error) {
        console.log("Failed to add project to favorite");
        set((state) => {
          lodashSet(state.projectMap, [projectId, "is_favorite"], true);
        });
        throw error;
      }
    },

    /**
     * Updates the project view
     * @param workspaceSlug
     * @param projectId
     * @param viewProps
     * @returns
     */
    updateProjectView: async (workspaceSlug: string, projectId: string, viewProps: { sort_order: number }, projectService: ProjectService) => {
      const currentProjectSortOrder = get().projectMap[projectId]?.sort_order;
      try {
        set((state) => {
          lodashSet(state.projectMap, [projectId, "sort_order"], viewProps?.sort_order);
        });
        const response = await projectService.setProjectView(workspaceSlug, projectId, viewProps);
        return response;
      } catch (error) {
        set((state) => {
          lodashSet(state.projectMap, [projectId, "sort_order"], currentProjectSortOrder);
        });
        console.log("Failed to update sort order of the projects");
        throw error;
      }
    },

    /**
     * Creates a project in the workspace and adds it to the store
     * @param workspaceSlug
     * @param data
     * @returns Promise<TProject>
     */
    createProject: async (workspaceSlug: string, data: any, projectService: ProjectService, rootStore: CoreRootStore) => {
      try {
        const response = await projectService.createProject(workspaceSlug, data);
        get().processProjectAfterCreation(workspaceSlug, response, rootStore);
        return response;
      } catch (error) {
        console.log("Failed to create project from project store");
        throw error;
      }
    },

    /**
     * Updates a details of a project and updates it in the store
     * @param workspaceSlug
     * @param projectId
     * @param data
     * @returns Promise<TProject>
     */
    updateProject: async (workspaceSlug: string, projectId: string, data: Partial<TProject>, projectService: ProjectService) => {
      const projectDetails = cloneDeep(get().projectMap[projectId]);
      try {
        set((state) => {
          lodashSet(state.projectMap, [projectId], { ...projectDetails, ...data });
          state.isUpdatingProject = true;
        });
        const response = await projectService.updateProject(workspaceSlug, projectId, data);
        set((state) => {
          state.isUpdatingProject = false;
        });
        return response;
      } catch (error) {
        console.log("Failed to create project from project store");
        set((state) => {
          lodashSet(state.projectMap, [projectId], projectDetails);
          state.isUpdatingProject = false;
        });
        throw error;
      }
    },

    /**
     * Deletes a project from specific workspace and deletes it from the store
     * @param workspaceSlug
     * @param projectId
     * @returns Promise<void>
     */
    deleteProject: async (workspaceSlug: string, projectId: string, projectService: ProjectService, rootStore: CoreRootStore) => {
      try {
        if (!get().projectMap?.[projectId]) return;
        await projectService.deleteProject(workspaceSlug, projectId);
        set((state) => {
          delete state.projectMap[projectId];
        });
        if (rootStore.favorite.entityMap[projectId]) rootStore.favorite.removeFavoriteFromStore(projectId);
        delete rootStore.user.permission.workspaceProjectsPermissions[workspaceSlug][projectId];
      } catch (error) {
        console.log("Failed to delete project from project store");
        throw error;
      }
    },

    /**
     * Archives a project from specific workspace and updates it in the store
     * @param workspaceSlug
     * @param projectId
     * @returns Promise<void>
     */
    archiveProject: async (workspaceSlug: string, projectId: string, projectArchiveService: ProjectArchiveService, rootStore: CoreRootStore) => {
      await projectArchiveService
        .archiveProject(workspaceSlug, projectId)
        .then((response) => {
          set((state) => {
            lodashSet(state.projectMap, [projectId, "archived_at"], response.archived_at);
          });
          rootStore.favorite.removeFavoriteFromStore(projectId);
        })
        .catch((error) => {
          console.log("Failed to archive project from project store");
          throw error;
        });
    },

    /**
     * Restores a project from specific workspace and updates it in the store
     * @param workspaceSlug
     * @param projectId
     * @returns Promise<void>
     */
    restoreProject: async (workspaceSlug: string, projectId: string, projectArchiveService: ProjectArchiveService) => {
      await projectArchiveService
        .restoreProject(workspaceSlug, projectId)
        .then(() => {
          set((state) => {
            lodashSet(state.projectMap, [projectId, "archived_at"], null);
          });
        })
        .catch((error) => {
          console.log("Failed to restore project from project store");
          throw error;
        });
    },
  }))
);

// Legacy interface
export interface IProjectStore {
  // observables
  isUpdatingProject: boolean;
  loader: TLoader;
  fetchStatus: TFetchStatus;
  projectMap: Record<string, TProject>; // projectId: project info
  projectAnalyticsCountMap: Record<string, TProjectAnalyticsCount>; // projectId: project analytics count
  // computed
  isInitializingProjects: boolean;
  filteredProjectIds: string[] | undefined;
  workspaceProjectIds: string[] | undefined;
  archivedProjectIds: string[] | undefined;
  totalProjectIds: string[] | undefined;
  joinedProjectIds: string[];
  favoriteProjectIds: string[];
  currentProjectDetails: TProject | undefined;
  currentProjectNextSequenceId: number | undefined;
  // actions
  getProjectById: (projectId: string | undefined | null) => TProject | undefined;
  getPartialProjectById: (projectId: string | undefined | null) => TPartialProject | undefined;
  getProjectIdentifierById: (projectId: string | undefined | null) => string;
  getProjectAnalyticsCountById: (projectId: string | undefined | null) => TProjectAnalyticsCount | undefined;
  getProjectByIdentifier: (projectIdentifier: string) => TProject | undefined;
  // collapsible
  openCollapsibleSection: ProjectOverviewCollapsible[];
  lastCollapsibleAction: ProjectOverviewCollapsible | null;

  setOpenCollapsibleSection: (section: ProjectOverviewCollapsible[]) => void;
  setLastCollapsibleAction: (section: ProjectOverviewCollapsible) => void;
  toggleOpenCollapsibleSection: (section: ProjectOverviewCollapsible) => void;

  // helper actions
  processProjectAfterCreation: (workspaceSlug: string, data: TProject) => void;

  // fetch actions
  fetchPartialProjects: (workspaceSlug: string) => Promise<TPartialProject[]>;
  fetchProjects: (workspaceSlug: string) => Promise<TProject[]>;
  fetchProjectDetails: (workspaceSlug: string, projectId: string) => Promise<TProject>;
  fetchProjectAnalyticsCount: (
    workspaceSlug: string,
    params?: TProjectAnalyticsCountParams
  ) => Promise<TProjectAnalyticsCount[]>;
  // favorites actions
  addProjectToFavorites: (workspaceSlug: string, projectId: string) => Promise<any>;
  removeProjectFromFavorites: (workspaceSlug: string, projectId: string) => Promise<any>;
  // project-view action
  updateProjectView: (workspaceSlug: string, projectId: string, viewProps: any) => Promise<any>;
  // CRUD actions
  createProject: (workspaceSlug: string, data: Partial<TProject>) => Promise<TProject>;
  updateProject: (workspaceSlug: string, projectId: string, data: Partial<TProject>) => Promise<TProject>;
  deleteProject: (workspaceSlug: string, projectId: string) => Promise<void>;
  // archive actions
  archiveProject: (workspaceSlug: string, projectId: string) => Promise<void>;
  restoreProject: (workspaceSlug: string, projectId: string) => Promise<void>;
}

// Legacy class wrapper for backward compatibility
export class ProjectStore implements IProjectStore {
  // root store
  rootStore: CoreRootStore;
  // services
  projectService;
  projectArchiveService;
  issueLabelService;
  issueService;
  stateService;

  constructor(_rootStore: CoreRootStore) {
    this.rootStore = _rootStore;
    // services
    this.projectService = new ProjectService();
    this.projectArchiveService = new ProjectArchiveService();
    this.issueService = new IssueService();
    this.issueLabelService = new IssueLabelService();
    this.stateService = new ProjectStateService();
  }

  private get store() {
    return useProjectStore.getState();
  }

  get isUpdatingProject() {
    return this.store.isUpdatingProject;
  }

  get loader() {
    return this.store.loader;
  }

  get fetchStatus() {
    return this.store.fetchStatus;
  }

  get projectMap() {
    return this.store.projectMap;
  }

  get projectAnalyticsCountMap() {
    return this.store.projectAnalyticsCountMap;
  }

  get openCollapsibleSection() {
    return this.store.openCollapsibleSection;
  }

  get lastCollapsibleAction() {
    return this.store.lastCollapsibleAction;
  }

  /**
   * @description returns true if projects are still initializing
   */
  get isInitializingProjects() {
    return this.store.loader === "init-loader";
  }

  /**
   * @description returns filtered projects based on filters and search query
   */
  get filteredProjectIds() {
    const workspaceDetails = this.rootStore.workspaceRoot.currentWorkspace;
    const {
      currentWorkspaceDisplayFilters: displayFilters,
      currentWorkspaceFilters: filters,
      searchQuery,
    } = this.rootStore.projectRoot.projectFilter;
    if (!workspaceDetails || !displayFilters || !filters) return;
    let workspaceProjects = Object.values(this.store.projectMap).filter(
      (p) =>
        p.workspace === workspaceDetails.id &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.identifier.toLowerCase().includes(searchQuery.toLowerCase())) &&
        shouldFilterProject(p, displayFilters, filters)
    );
    workspaceProjects = orderProjects(workspaceProjects, displayFilters.order_by);
    return workspaceProjects.map((p) => p.id);
  }

  /**
   * Returns project IDs belong to the current workspace
   */
  get workspaceProjectIds() {
    const workspaceDetails = this.rootStore.workspaceRoot.currentWorkspace;
    if (!workspaceDetails) return;
    const workspaceProjects = Object.values(this.store.projectMap).filter(
      (p) => p.workspace === workspaceDetails.id && !p.archived_at
    );
    const projectIds = workspaceProjects.map((p) => p.id);
    return projectIds ?? null;
  }

  /**
   * Returns archived project IDs belong to current workspace.
   */
  get archivedProjectIds() {
    const currentWorkspace = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspace) return;

    let projects = Object.values(this.store.projectMap ?? {});
    projects = sortBy(projects, "archived_at");

    const projectIds = projects
      .filter((project) => project.workspace === currentWorkspace.id && !!project.archived_at)
      .map((project) => project.id);
    return projectIds;
  }

  /**
   * Returns total project IDs belong to the current workspace
   */
  // workspaceProjectIds + archivedProjectIds
  get totalProjectIds() {
    const currentWorkspace = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspace) return;

    const workspaceProjects = this.workspaceProjectIds ?? [];
    const archivedProjects = this.archivedProjectIds ?? [];
    return [...workspaceProjects, ...archivedProjects];
  }

  /**
   * Returns current project details
   */
  get currentProjectDetails() {
    if (!this.rootStore.router.projectId) return;
    return this.store.projectMap?.[this.rootStore.router.projectId];
  }

  /**
   * Returns the next sequence ID for the current project
   * Used for calculating identifier width in list layouts
   */
  get currentProjectNextSequenceId() {
    if (!this.rootStore.router.projectId) return undefined;
    return this.currentProjectDetails?.next_work_item_sequence;
  }

  /**
   * Returns joined project IDs belong to the current workspace
   */
  get joinedProjectIds() {
    const currentWorkspace = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspace) return [];

    let projects = Object.values(this.store.projectMap ?? {});
    projects = sortBy(projects, "sort_order");

    const projectIds = projects
      .filter((project) => project.workspace === currentWorkspace.id && !!project.member_role && !project.archived_at)
      .map((project) => project.id);
    return projectIds;
  }

  /**
   * Returns favorite project IDs belong to the current workspace
   */
  get favoriteProjectIds() {
    const currentWorkspace = this.rootStore.workspaceRoot.currentWorkspace;
    if (!currentWorkspace) return [];

    let projects = Object.values(this.store.projectMap ?? {});
    projects = sortBy(projects, "created_at");

    const projectIds = projects
      .filter(
        (project) =>
          project.workspace === currentWorkspace.id &&
          !!project.member_role &&
          project.is_favorite &&
          !project.archived_at
      )
      .map((project) => project.id);
    return projectIds;
  }

  setOpenCollapsibleSection = (section: ProjectOverviewCollapsible[]) => {
    this.store.setOpenCollapsibleSection(section);
  };

  setLastCollapsibleAction = (section: ProjectOverviewCollapsible) => {
    this.store.setLastCollapsibleAction(section);
  };

  toggleOpenCollapsibleSection = (section: ProjectOverviewCollapsible) => {
    this.store.toggleOpenCollapsibleSection(section);
  };

  /**
   * @description process project after creation
   * @param workspaceSlug
   * @param data
   */
  processProjectAfterCreation = (workspaceSlug: string, data: TProject) => {
    this.store.processProjectAfterCreation(workspaceSlug, data, this.rootStore);
  };

  /**
   * get Workspace projects partial data using workspace slug
   * @param workspaceSlug
   * @returns Promise<TPartialProject[]>
   *
   */
  fetchPartialProjects = async (workspaceSlug: string) => {
    return this.store.fetchPartialProjects(workspaceSlug, this.projectService);
  };

  /**
   * get Workspace projects using workspace slug
   * @param workspaceSlug
   * @returns Promise<TProject[]>
   *
   */
  fetchProjects = async (workspaceSlug: string) => {
    return this.store.fetchProjects(workspaceSlug, this.projectService, this.workspaceProjectIds);
  };

  /**
   * Fetches project details using workspace slug and project id
   * @param workspaceSlug
   * @param projectId
   * @returns Promise<TProject>
   */
  fetchProjectDetails = async (workspaceSlug: string, projectId: string) => {
    return this.store.fetchProjectDetails(workspaceSlug, projectId, this.projectService);
  };

  /**
   * Fetches project analytics count using workspace slug and project id
   * @param workspaceSlug
   * @param params TProjectAnalyticsCountParams
   * @returns Promise<TProjectAnalyticsCount[]>
   */
  fetchProjectAnalyticsCount = async (
    workspaceSlug: string,
    params?: TProjectAnalyticsCountParams
  ): Promise<TProjectAnalyticsCount[]> => {
    return this.store.fetchProjectAnalyticsCount(workspaceSlug, params, this.projectService);
  };

  /**
   * Returns project details using project id
   * @param projectId
   * @returns TProject | null
   */
  getProjectById = (projectId: string | undefined | null) => {
    const projectInfo = this.store.projectMap[projectId ?? ""] || undefined;
    return projectInfo;
  };

  /**
   * Returns project details using project identifier
   * @param projectIdentifier
   * @returns TProject | undefined
   */
  getProjectByIdentifier = (projectIdentifier: string) => {
    return Object.values(this.store.projectMap).find((project) => project.identifier === projectIdentifier);
  };

  /**
   * Returns project lite using project id
   * This method is used just for type safety
   * @param projectId
   * @returns TPartialProject | null
   */
  getPartialProjectById = (projectId: string | undefined | null) => {
    const projectInfo = this.store.projectMap[projectId ?? ""] || undefined;
    return projectInfo;
  };

  /**
   * Returns project identifier using project id
   * @param projectId
   * @returns string
   */
  getProjectIdentifierById = (projectId: string | undefined | null) => {
    const projectInfo = this.store.projectMap?.[projectId ?? ""];
    return projectInfo?.identifier;
  };

  /**
   * Returns project analytics count using project id
   * @param projectId
   * @returns TProjectAnalyticsCount[]
   */
  getProjectAnalyticsCountById = (projectId: string | undefined | null) => {
    if (!projectId) return undefined;
    return this.store.projectAnalyticsCountMap?.[projectId];
  };

  /**
   * Adds project to favorites and updates project favorite status in the store
   * @param workspaceSlug
   * @param projectId
   * @returns
   */
  addProjectToFavorites = async (workspaceSlug: string, projectId: string) => {
    return this.store.addProjectToFavorites(workspaceSlug, projectId, this.rootStore);
  };

  /**
   * Removes project from favorites and updates project favorite status in the store
   * @param workspaceSlug
   * @param projectId
   * @returns
   */
  removeProjectFromFavorites = async (workspaceSlug: string, projectId: string) => {
    return this.store.removeProjectFromFavorites(workspaceSlug, projectId, this.rootStore);
  };

  /**
   * Updates the project view
   * @param workspaceSlug
   * @param projectId
   * @param viewProps
   * @returns
   */
  updateProjectView = async (workspaceSlug: string, projectId: string, viewProps: { sort_order: number }) => {
    return this.store.updateProjectView(workspaceSlug, projectId, viewProps, this.projectService);
  };

  /**
   * Creates a project in the workspace and adds it to the store
   * @param workspaceSlug
   * @param data
   * @returns Promise<TProject>
   */
  createProject = async (workspaceSlug: string, data: any) => {
    return this.store.createProject(workspaceSlug, data, this.projectService, this.rootStore);
  };

  /**
   * Updates a details of a project and updates it in the store
   * @param workspaceSlug
   * @param projectId
   * @param data
   * @returns Promise<TProject>
   */
  updateProject = async (workspaceSlug: string, projectId: string, data: Partial<TProject>) => {
    return this.store.updateProject(workspaceSlug, projectId, data, this.projectService);
  };

  /**
   * Deletes a project from specific workspace and deletes it from the store
   * @param workspaceSlug
   * @param projectId
   * @returns Promise<void>
   */
  deleteProject = async (workspaceSlug: string, projectId: string) => {
    return this.store.deleteProject(workspaceSlug, projectId, this.projectService, this.rootStore);
  };

  /**
   * Archives a project from specific workspace and updates it in the store
   * @param workspaceSlug
   * @param projectId
   * @returns Promise<void>
   */
  archiveProject = async (workspaceSlug: string, projectId: string) => {
    return this.store.archiveProject(workspaceSlug, projectId, this.projectArchiveService, this.rootStore);
  };

  /**
   * Restores a project from specific workspace and updates it in the store
   * @param workspaceSlug
   * @param projectId
   * @returns Promise<void>
   */
  restoreProject = async (workspaceSlug: string, projectId: string) => {
    return this.store.restoreProject(workspaceSlug, projectId, this.projectArchiveService);
  };
}
