import { create } from "zustand";
import { set as lodashSet } from "lodash-es";
import type { TLink, TLinkIdMap, TLinkMap } from "@plane/types";
import { WorkspaceService } from "@/plane-web/services";

/**
 * Workspace Link state managed by Zustand.
 * Migrated from MobX WorkspaceLinkStore to Zustand.
 */
interface WorkspaceLinkStoreState {
  // Data storage
  links: TLinkIdMap;
  linkMap: TLinkMap;
  linkData: TLink | undefined;
  // UI state
  isLinkModalOpen: boolean;
}

interface WorkspaceLinkStoreActions {
  // Data actions
  addLinks: (workspaceSlug: string, links: TLink[]) => void;
  fetchLinks: (workspaceSlug: string) => Promise<TLink[]>;
  createLink: (workspaceSlug: string, data: Partial<TLink>) => Promise<TLink>;
  updateLink: (workspaceSlug: string, linkId: string, data: Partial<TLink>) => Promise<TLink>;
  removeLink: (workspaceSlug: string, linkId: string) => Promise<void>;
  setLinkData: (link: TLink | undefined) => void;
  // UI actions
  toggleLinkModal: (isOpen: boolean) => void;
  // Helper methods
  getLinksByWorkspaceId: (workspaceSlug: string) => string[] | undefined;
  getLinkById: (linkId: string) => TLink | undefined;
}

export type WorkspaceLinkStore = WorkspaceLinkStoreState & WorkspaceLinkStoreActions;

const initialState: WorkspaceLinkStoreState = {
  links: {},
  linkMap: {},
  linkData: undefined,
  isLinkModalOpen: false,
};

// Service instance
const workspaceService = new WorkspaceService();

/**
 * Workspace Link Store (Zustand)
 *
 * Manages workspace-level links (shared URLs, resources, etc.).
 * Migrated from MobX to Zustand.
 *
 * Migration notes:
 * - Previously used MobX observables and actions with runInAction
 * - Now uses Zustand with immutable updates
 * - State updates are synchronous and batched automatically
 */
export const useWorkspaceLinkStore = create<WorkspaceLinkStore>()((set, get) => ({
  ...initialState,

  // Helper methods
  getLinksByWorkspaceId: (workspaceSlug) => {
    if (!workspaceSlug) return undefined;
    return get().links[workspaceSlug] ?? undefined;
  },

  getLinkById: (linkId) => {
    if (!linkId) return undefined;
    return get().linkMap[linkId] ?? undefined;
  },

  // UI actions
  setLinkData: (link) => {
    set({ linkData: link });
  },

  toggleLinkModal: (isOpen) => {
    set({ isLinkModalOpen: isOpen });
  },

  // Data actions
  addLinks: (workspaceSlug, links) => {
    set((state) => {
      const newLinks = { ...state.links };
      const newLinkMap = { ...state.linkMap };

      newLinks[workspaceSlug] = links.map((link) => link.id);
      links.forEach((link) => {
        newLinkMap[link.id] = link;
      });

      return {
        links: newLinks,
        linkMap: newLinkMap,
      };
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
      const newLinks = { ...state.links };
      const newLinkMap = { ...state.linkMap };

      newLinks[workspaceSlug] = [response.id, ...(state.links[workspaceSlug] ?? [])];
      newLinkMap[response.id] = response;

      return {
        links: newLinks,
        linkMap: newLinkMap,
      };
    });

    return response;
  },

  updateLink: async (workspaceSlug, linkId, data) => {
    // Optimistic update
    set((state) => {
      const newLinkMap = { ...state.linkMap };
      const existingLink = newLinkMap[linkId];

      if (existingLink) {
        newLinkMap[linkId] = { ...existingLink, ...data };
      }

      return { linkMap: newLinkMap };
    });

    const response = await workspaceService.updateWorkspaceLink(workspaceSlug, linkId, data);
    return response;
  },

  removeLink: async (workspaceSlug, linkId) => {
    await workspaceService.deleteWorkspaceLink(workspaceSlug, linkId);

    set((state) => {
      const newLinks = { ...state.links };
      const newLinkMap = { ...state.linkMap };

      if (newLinks[workspaceSlug]) {
        const linkIndex = newLinks[workspaceSlug].findIndex((link) => link === linkId);
        if (linkIndex >= 0) {
          newLinks[workspaceSlug] = [...newLinks[workspaceSlug]];
          newLinks[workspaceSlug].splice(linkIndex, 1);
        }
      }

      delete newLinkMap[linkId];

      return {
        links: newLinks,
        linkMap: newLinkMap,
      };
    });
  },
}));
