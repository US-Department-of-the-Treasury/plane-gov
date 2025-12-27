import { clone, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IWorkspaceSidebarNavigationItem, IWorkspace, IWorkspaceSidebarNavigation } from "@plane/types";
// services
import { WorkspaceService } from "@/plane-web/services";
// store
import type { CoreRootStore } from "@/store/root.store";
import { getRouterWorkspaceSlug } from "@/store/client/router.store";
// sub-stores
import type { IApiTokenStore } from "./api-token.store";
import { ApiTokenStore } from "./api-token.store";
import type { IHomeStore } from "./home";
import { HomeStore } from "./home";
import type { IWebhookStore } from "./webhook.store";
import { WebhookStore } from "./webhook.store";

// Zustand Store
interface WorkspaceRootState {
  loader: boolean;
  workspaces: Record<string, IWorkspace>;
  navigationPreferencesMap: Record<string, IWorkspaceSidebarNavigation>;
}

interface WorkspaceRootActions {
  fetchWorkspaces: () => Promise<IWorkspace[]>;
  createWorkspace: (data: Partial<IWorkspace>) => Promise<IWorkspace>;
  updateWorkspace: (workspaceSlug: string, data: Partial<IWorkspace>) => Promise<IWorkspace>;
  updateWorkspaceLogo: (workspaceSlug: string, logoURL: string) => void;
  deleteWorkspace: (workspaceSlug: string) => Promise<void>;
  fetchSidebarNavigationPreferences: (workspaceSlug: string) => Promise<void>;
  updateSidebarPreference: (
    workspaceSlug: string,
    key: string,
    data: Partial<IWorkspaceSidebarNavigationItem>
  ) => Promise<IWorkspaceSidebarNavigationItem | undefined>;
  updateBulkSidebarPreferences: (
    workspaceSlug: string,
    data: Array<{ key: string; is_pinned: boolean; sort_order: number }>
  ) => Promise<void>;
}

type WorkspaceRootStoreType = WorkspaceRootState & WorkspaceRootActions;

const workspaceService = new WorkspaceService();

export const useWorkspaceRootStore = create<WorkspaceRootStoreType>()(
  immer((set, get) => ({
    // State
    loader: false,
    workspaces: {},
    navigationPreferencesMap: {},

    // Actions
    fetchWorkspaces: async () => {
      set((state) => {
        state.loader = true;
      });
      try {
        const workspaceResponse = await workspaceService.userWorkspaces();
        set((state) => {
          workspaceResponse.forEach((workspace) => {
            state.workspaces[workspace.id] = workspace;
          });
        });
        return workspaceResponse;
      } finally {
        set((state) => {
          state.loader = false;
        });
      }
    },

    createWorkspace: async (data) => {
      const response = await workspaceService.createWorkspace(data);
      set((state) => {
        state.workspaces[response.id] = response;
      });
      return response;
    },

    updateWorkspace: async (workspaceSlug, data) => {
      const res = await workspaceService.updateWorkspace(workspaceSlug, data);
      if (res && res.id) {
        set((state) => {
          Object.keys(data).forEach((key) => {
            if (state.workspaces[res.id]) {
              lodashSet(state.workspaces[res.id], key, data[key as keyof IWorkspace]);
            }
          });
        });
      }
      return res;
    },

    updateWorkspaceLogo: (workspaceSlug, logoURL) => {
      set((state) => {
        const workspace = Object.values(state.workspaces).find((w) => w.slug === workspaceSlug);
        if (workspace) {
          workspace.logo_url = logoURL;
        }
      });
    },

    deleteWorkspace: async (workspaceSlug) => {
      try {
        await workspaceService.deleteWorkspace(workspaceSlug);
        set((state) => {
          const workspace = Object.values(state.workspaces).find((w) => w.slug === workspaceSlug);
          if (workspace) {
            delete state.workspaces[workspace.id];
          }
        });
      } catch (error) {
        console.error("Failed to delete workspace:", error);
      }
    },

    fetchSidebarNavigationPreferences: async (workspaceSlug) => {
      try {
        const response = await workspaceService.fetchSidebarNavigationPreferences(workspaceSlug);
        set((state) => {
          state.navigationPreferencesMap[workspaceSlug] = response;
        });
      } catch (error) {
        console.error("Failed to fetch sidebar preferences:", error);
      }
    },

    updateSidebarPreference: async (workspaceSlug, key, data) => {
      const state = get();
      const beforeUpdateData = clone(state.navigationPreferencesMap[workspaceSlug]?.[key]);

      try {
        set((state) => {
          state.navigationPreferencesMap[workspaceSlug] = {
            ...state.navigationPreferencesMap[workspaceSlug],
            [key]: {
              ...beforeUpdateData,
              ...data,
            },
          };
        });

        const response = await workspaceService.updateSidebarPreference(workspaceSlug, key, data);
        return response;
      } catch (error) {
        // Revert to original data if API call fails
        set((state) => {
          state.navigationPreferencesMap[workspaceSlug] = {
            ...state.navigationPreferencesMap[workspaceSlug],
            [key]: beforeUpdateData,
          };
        });
        console.error("Failed to update sidebar preference:", error);
      }
    },

    updateBulkSidebarPreferences: async (workspaceSlug, data) => {
      const state = get();
      const beforeUpdateData = clone(state.navigationPreferencesMap[workspaceSlug]);

      try {
        // Optimistically update store
        const updatedPreferences: IWorkspaceSidebarNavigation = {};
        data.forEach((item) => {
          updatedPreferences[item.key] = item;
        });

        set((state) => {
          state.navigationPreferencesMap[workspaceSlug] = {
            ...state.navigationPreferencesMap[workspaceSlug],
            ...updatedPreferences,
          };
        });

        // Call API to persist changes
        await workspaceService.updateBulkSidebarPreferences(workspaceSlug, data);
      } catch (error) {
        // Rollback on failure
        set((state) => {
          state.navigationPreferencesMap[workspaceSlug] = beforeUpdateData;
        });
        console.error("Failed to update bulk sidebar preferences:", error);
        throw error;
      }
    },
  }))
);

// Legacy interface for backward compatibility
export interface IWorkspaceRootStore {
  loader: boolean;
  // observables
  workspaces: Record<string, IWorkspace>;
  // computed
  currentWorkspace: IWorkspace | null;
  workspacesCreatedByCurrentUser: IWorkspace[] | null;
  navigationPreferencesMap: Record<string, IWorkspaceSidebarNavigation>;
  getWorkspaceRedirectionUrl: () => string;
  // computed actions
  getWorkspaceBySlug: (workspaceSlug: string) => IWorkspace | null;
  getWorkspaceById: (workspaceId: string) => IWorkspace | null;
  // fetch actions
  fetchWorkspaces: () => Promise<IWorkspace[]>;
  // crud actions
  createWorkspace: (data: Partial<IWorkspace>) => Promise<IWorkspace>;
  updateWorkspace: (workspaceSlug: string, data: Partial<IWorkspace>) => Promise<IWorkspace>;
  updateWorkspaceLogo: (workspaceSlug: string, logoURL: string) => void;
  deleteWorkspace: (workspaceSlug: string) => Promise<void>;
  fetchSidebarNavigationPreferences: (workspaceSlug: string) => Promise<void>;
  updateSidebarPreference: (
    workspaceSlug: string,
    key: string,
    data: Partial<IWorkspaceSidebarNavigationItem>
  ) => Promise<IWorkspaceSidebarNavigationItem | undefined>;
  updateBulkSidebarPreferences: (
    workspaceSlug: string,
    data: Array<{ key: string; is_pinned: boolean; sort_order: number }>
  ) => Promise<void>;
  getNavigationPreferences: (workspaceSlug: string) => IWorkspaceSidebarNavigation | undefined;
  mutateWorkspaceMembersActivity: (workspaceSlug: string) => Promise<void>;
  // sub-stores
  webhook: IWebhookStore;
  apiToken: IApiTokenStore;
  home: IHomeStore;
}

// Legacy class wrapper for backward compatibility
export abstract class BaseWorkspaceRootStore implements IWorkspaceRootStore {
  // root store references
  protected rootStore: CoreRootStore;
  user;

  // sub-stores
  webhook: IWebhookStore;
  apiToken: IApiTokenStore;
  home: IHomeStore;

  constructor(_rootStore: CoreRootStore) {
    this.rootStore = _rootStore;
    this.user = _rootStore.user;
    this.home = new HomeStore();
    this.webhook = new WebhookStore(_rootStore);
    this.apiToken = new ApiTokenStore(_rootStore);
  }

  private get store() {
    return useWorkspaceRootStore.getState();
  }

  get loader() {
    return this.store.loader;
  }

  get workspaces() {
    return this.store.workspaces;
  }

  get navigationPreferencesMap() {
    return this.store.navigationPreferencesMap;
  }

  /**
   * get the workspace redirection url based on the last and fallback workspace_slug
   */
  getWorkspaceRedirectionUrl = () => {
    let redirectionRoute = "/create-workspace";
    // validate the last and fallback workspace_slug
    const currentWorkspaceSlug =
      this.user.userSettings?.data?.workspace?.last_workspace_slug ||
      this.user.userSettings?.data?.workspace?.fallback_workspace_slug;

    // validate the current workspace_slug is available in the user's workspace list
    const isCurrentWorkspaceValid = Object.values(this.store.workspaces || {}).findIndex(
      (workspace) => workspace.slug === currentWorkspaceSlug
    );

    if (isCurrentWorkspaceValid >= 0) redirectionRoute = `/${currentWorkspaceSlug}`;
    return redirectionRoute;
  };

  /**
   * computed value of current workspace based on workspace slug saved in the query store
   */
  get currentWorkspace() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return null;
    const workspaceDetails = Object.values(this.store.workspaces ?? {})?.find((w) => w.slug === workspaceSlug);
    return workspaceDetails || null;
  }

  /**
   * computed value of all the workspaces created by the current logged in user
   */
  get workspacesCreatedByCurrentUser() {
    if (!this.store.workspaces) return null;
    const user = this.user.data;
    if (!user) return null;
    const userWorkspaces = Object.values(this.store.workspaces ?? {})?.filter((w) => w.created_by === user?.id);
    return userWorkspaces || null;
  }

  /**
   * get workspace info from the array of workspaces in the store using workspace slug
   * @param workspaceSlug
   */
  getWorkspaceBySlug = (workspaceSlug: string) =>
    Object.values(this.store.workspaces ?? {})?.find((w) => w.slug == workspaceSlug) || null;

  /**
   * get workspace info from the array of workspaces in the store using workspace id
   * @param workspaceId
   */
  getWorkspaceById = (workspaceId: string) => this.store.workspaces?.[workspaceId] || null;

  getNavigationPreferences = (workspaceSlug: string): IWorkspaceSidebarNavigation | undefined =>
    this.store.navigationPreferencesMap[workspaceSlug];

  // Actions
  fetchWorkspaces = () => this.store.fetchWorkspaces();
  createWorkspace = (data: Partial<IWorkspace>) => this.store.createWorkspace(data);
  updateWorkspace = (workspaceSlug: string, data: Partial<IWorkspace>) => this.store.updateWorkspace(workspaceSlug, data);
  updateWorkspaceLogo = (workspaceSlug: string, logoURL: string) => this.store.updateWorkspaceLogo(workspaceSlug, logoURL);
  deleteWorkspace = (workspaceSlug: string) => this.store.deleteWorkspace(workspaceSlug);
  fetchSidebarNavigationPreferences = (workspaceSlug: string) => this.store.fetchSidebarNavigationPreferences(workspaceSlug);
  updateSidebarPreference = (workspaceSlug: string, key: string, data: Partial<IWorkspaceSidebarNavigationItem>) =>
    this.store.updateSidebarPreference(workspaceSlug, key, data);
  updateBulkSidebarPreferences = (
    workspaceSlug: string,
    data: Array<{ key: string; is_pinned: boolean; sort_order: number }>
  ) => this.store.updateBulkSidebarPreferences(workspaceSlug, data);

  /**
   * Mutate workspace members activity
   * @param workspaceSlug
   */
  abstract mutateWorkspaceMembersActivity(workspaceSlug: string): Promise<void>;
}
