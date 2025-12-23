import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { TLink, TLinkIdMap, TLinkMap } from "@plane/types";
// services
import { WorkspaceService } from "@/plane-web/services";

// Zustand Store
interface WorkspaceLinkState {
  links: TLinkIdMap;
  linkMap: TLinkMap;
  linkData: TLink | undefined;
  isLinkModalOpen: boolean;
}

interface WorkspaceLinkActions {
  addLinks: (workspaceSlug: string, links: TLink[]) => void;
  fetchLinks: (workspaceSlug: string) => Promise<TLink[]>;
  createLink: (workspaceSlug: string, data: Partial<TLink>) => Promise<TLink>;
  updateLink: (workspaceSlug: string, linkId: string, data: Partial<TLink>) => Promise<TLink>;
  removeLink: (workspaceSlug: string, linkId: string) => Promise<void>;
  setLinkData: (link: TLink | undefined) => void;
  toggleLinkModal: (isOpen: boolean) => void;
}

type WorkspaceLinkStoreType = WorkspaceLinkState & WorkspaceLinkActions;

const workspaceService = new WorkspaceService();

export const useWorkspaceLinkStore = create<WorkspaceLinkStoreType>()(
  immer((set, get) => ({
    // State
    links: {},
    linkMap: {},
    linkData: undefined,
    isLinkModalOpen: false,

    // Actions
    setLinkData: (link) => {
      set((state) => {
        state.linkData = link;
      });
    },

    toggleLinkModal: (isOpen) => {
      set((state) => {
        state.isLinkModalOpen = isOpen;
      });
    },

    addLinks: (workspaceSlug, links) => {
      set((state) => {
        state.links[workspaceSlug] = links.map((link) => link.id);
        links.forEach((link) => {
          state.linkMap[link.id] = link;
        });
      });
    },

    fetchLinks: async (workspaceSlug) => {
      const response = await workspaceService.fetchWorkspaceLinks(workspaceSlug);
      get().addLinks(workspaceSlug, response);
      return response;
    },

    createLink: async (workspaceSlug, data) => {
      const response = await workspaceService.createWorkspaceLink(workspaceSlug, data);

      set((state) => {
        state.links[workspaceSlug] = [response.id, ...(state.links[workspaceSlug] ?? [])];
        state.linkMap[response.id] = response;
      });
      return response;
    },

    updateLink: async (workspaceSlug, linkId, data) => {
      set((state) => {
        Object.keys(data).forEach((key) => {
          if (state.linkMap[linkId]) {
            lodashSet(state.linkMap[linkId], key, data[key as keyof TLink]);
          }
        });
      });

      const response = await workspaceService.updateWorkspaceLink(workspaceSlug, linkId, data);
      return response;
    },

    removeLink: async (workspaceSlug, linkId) => {
      await workspaceService.deleteWorkspaceLink(workspaceSlug, linkId);

      set((state) => {
        const linkIndex = state.links[workspaceSlug]?.findIndex((link) => link === linkId);
        if (linkIndex !== undefined && linkIndex >= 0) {
          state.links[workspaceSlug].splice(linkIndex, 1);
          delete state.linkMap[linkId];
        }
      });
    },
  }))
);

// Legacy interfaces for backward compatibility
export interface IWorkspaceLinkStoreActions {
  addLinks: (projectId: string, links: TLink[]) => void;
  fetchLinks: (workspaceSlug: string) => Promise<TLink[]>;
  createLink: (workspaceSlug: string, data: Partial<TLink>) => Promise<TLink>;
  updateLink: (workspaceSlug: string, linkId: string, data: Partial<TLink>) => Promise<TLink>;
  removeLink: (workspaceSlug: string, linkId: string) => Promise<void>;
  setLinkData: (link: TLink | undefined) => void;
  toggleLinkModal: (isOpen: boolean) => void;
}

export interface IWorkspaceLinkStore extends IWorkspaceLinkStoreActions {
  // observables
  links: TLinkIdMap;
  linkMap: TLinkMap;
  linkData: TLink | undefined;
  isLinkModalOpen: boolean;
  // helper methods
  getLinksByWorkspaceId: (projectId: string) => string[] | undefined;
  getLinkById: (linkId: string) => TLink | undefined;
}

// Legacy class wrapper for backward compatibility
export class WorkspaceLinkStore implements IWorkspaceLinkStore {
  private get store() {
    return useWorkspaceLinkStore.getState();
  }

  get links() {
    return this.store.links;
  }

  get linkMap() {
    return this.store.linkMap;
  }

  get linkData() {
    return this.store.linkData;
  }

  get isLinkModalOpen() {
    return this.store.isLinkModalOpen;
  }

  // Helper methods
  getLinksByWorkspaceId = (projectId: string) => {
    if (!projectId) return undefined;
    return this.store.links[projectId] ?? undefined;
  };

  getLinkById = (linkId: string) => {
    if (!linkId) return undefined;
    return this.store.linkMap[linkId] ?? undefined;
  };

  // Actions
  setLinkData = (link: TLink | undefined) => this.store.setLinkData(link);
  toggleLinkModal = (isOpen: boolean) => this.store.toggleLinkModal(isOpen);
  addLinks = (workspaceSlug: string, links: TLink[]) => this.store.addLinks(workspaceSlug, links);
  fetchLinks = (workspaceSlug: string) => this.store.fetchLinks(workspaceSlug);
  createLink = (workspaceSlug: string, data: Partial<TLink>) => this.store.createLink(workspaceSlug, data);
  updateLink = (workspaceSlug: string, linkId: string, data: Partial<TLink>) =>
    this.store.updateLink(workspaceSlug, linkId, data);
  removeLink = (workspaceSlug: string, linkId: string) => this.store.removeLink(workspaceSlug, linkId);
}
