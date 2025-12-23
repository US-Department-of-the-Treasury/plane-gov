import { create } from "zustand";
import { set as lodashSet } from "lodash-es";
// types
import type { TIssueLink, TIssueLinkMap, TIssueLinkIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueService } from "@/services/issue";

// ============================================================================
// State Interface
// ============================================================================

interface IssueLinkStoreState {
  // observables
  links: TIssueLinkIdMap; // issueId => linkId[]
  linkMap: TIssueLinkMap; // linkId => link
}

// ============================================================================
// Actions Interface
// ============================================================================

interface IssueLinkStoreActions {
  // actions
  addLinks: (issueId: string, links: TIssueLink[]) => void;
  fetchLinks: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    serviceType: TIssueServiceType
  ) => Promise<TIssueLink[]>;
  createLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueLink>,
    serviceType: TIssueServiceType,
    callbacks?: {
      updateIssueCount?: (issueId: string, count: number) => void;
      fetchActivities?: (workspaceSlug: string, projectId: string, issueId: string) => void;
    }
  ) => Promise<TIssueLink>;
  updateLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    data: Partial<TIssueLink>,
    serviceType: TIssueServiceType,
    callbacks?: {
      fetchActivities?: (workspaceSlug: string, projectId: string, issueId: string) => void;
    }
  ) => Promise<TIssueLink>;
  removeLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    serviceType: TIssueServiceType,
    callbacks?: {
      updateIssueCount?: (issueId: string, count: number) => void;
      fetchActivities?: (workspaceSlug: string, projectId: string, issueId: string) => void;
    }
  ) => Promise<void>;
  // helper methods
  getLinksByIssueId: (issueId: string) => string[] | undefined;
  getLinkById: (linkId: string) => TIssueLink | undefined;
  getIssueLinks: (issueId: string | undefined) => string[] | undefined;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type IssueLinkStore = IssueLinkStoreState & IssueLinkStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: IssueLinkStoreState = {
  links: {},
  linkMap: {},
};

// ============================================================================
// Service Factory
// ============================================================================

const getIssueService = (serviceType: TIssueServiceType) => new IssueService(serviceType);

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * Issue Link Store (Zustand)
 *
 * Manages issue links (external URLs attached to issues).
 * Migrated from MobX IssueLinkStore to Zustand.
 *
 * Migration notes:
 * - Service instance created on demand using serviceType parameter
 * - Computed `issueLinks` becomes helper method `getIssueLinks` that takes issueId
 * - Callbacks used for rootStore interactions (updateIssueCount, fetchActivities)
 * - Optimistic updates preserved in updateLink with error rollback
 */
export const useIssueLinkStore = create<IssueLinkStore>()((set, get) => ({
  ...initialState,

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getLinksByIssueId: (issueId) => {
    if (!issueId) return undefined;
    const state = get();
    return state.links[issueId] ?? undefined;
  },

  getLinkById: (linkId) => {
    if (!linkId) return undefined;
    const state = get();
    return state.linkMap[linkId] ?? undefined;
  },

  getIssueLinks: (issueId) => {
    if (!issueId) return undefined;
    const state = get();
    return state.links[issueId] ?? undefined;
  },

  // ============================================================================
  // Actions
  // ============================================================================

  addLinks: (issueId, links) => {
    set((state) => {
      const newLinkMap = { ...state.linkMap };
      links.forEach((link) => {
        lodashSet(newLinkMap, link.id, link);
      });

      return {
        links: {
          ...state.links,
          [issueId]: links.map((link) => link.id),
        },
        linkMap: newLinkMap,
      };
    });
  },

  fetchLinks: async (workspaceSlug, projectId, issueId, serviceType) => {
    const issueService = getIssueService(serviceType);
    const response = await issueService.fetchIssueLinks(workspaceSlug, projectId, issueId);
    get().addLinks(issueId, response);
    return response;
  },

  createLink: async (workspaceSlug, projectId, issueId, data, serviceType, callbacks) => {
    const issueService = getIssueService(serviceType);
    const state = get();
    const issueLinkCount = state.getLinksByIssueId(issueId)?.length ?? 0;

    const response = await issueService.createIssueLink(workspaceSlug, projectId, issueId, data);

    set((state) => {
      const currentLinks = state.links[issueId] || [];
      return {
        links: {
          ...state.links,
          [issueId]: [...currentLinks, response.id],
        },
        linkMap: {
          ...state.linkMap,
          [response.id]: response,
        },
      };
    });

    // Update issue link count
    if (callbacks?.updateIssueCount) {
      callbacks.updateIssueCount(issueId, issueLinkCount + 1);
    }

    // Fetch activities
    if (callbacks?.fetchActivities) {
      callbacks.fetchActivities(workspaceSlug, projectId, issueId);
    }

    return response;
  },

  updateLink: async (workspaceSlug, projectId, issueId, linkId, data, serviceType, callbacks) => {
    const issueService = getIssueService(serviceType);
    const state = get();
    const initialData = { ...state.linkMap[linkId] };

    try {
      // Optimistic update
      set((state) => {
        const updatedLink = { ...state.linkMap[linkId] };
        Object.keys(data).forEach((key) => {
          lodashSet(updatedLink, key, data[key as keyof TIssueLink]);
        });

        return {
          linkMap: {
            ...state.linkMap,
            [linkId]: updatedLink,
          },
        };
      });

      const response = await issueService.updateIssueLink(workspaceSlug, projectId, issueId, linkId, data);

      // Fetch activities
      if (callbacks?.fetchActivities) {
        callbacks.fetchActivities(workspaceSlug, projectId, issueId);
      }

      return response;
    } catch (error) {
      console.error("error", error);

      // Rollback on error
      set((state) => ({
        linkMap: {
          ...state.linkMap,
          [linkId]: initialData,
        },
      }));

      throw error;
    }
  },

  removeLink: async (workspaceSlug, projectId, issueId, linkId, serviceType, callbacks) => {
    const issueService = getIssueService(serviceType);
    const state = get();
    const issueLinkCount = state.getLinksByIssueId(issueId)?.length ?? 0;

    await issueService.deleteIssueLink(workspaceSlug, projectId, issueId, linkId);

    const linkIndex = (state.links[issueId] || []).findIndex((id) => id === linkId);
    if (linkIndex >= 0) {
      set((state) => {
        const updatedLinks = [...(state.links[issueId] || [])];
        updatedLinks.splice(linkIndex, 1);

        const newLinkMap = { ...state.linkMap };
        delete newLinkMap[linkId];

        return {
          links: {
            ...state.links,
            [issueId]: updatedLinks,
          },
          linkMap: newLinkMap,
        };
      });

      // Update issue link count
      if (callbacks?.updateIssueCount) {
        callbacks.updateIssueCount(issueId, issueLinkCount - 1);
      }
    }

    // Fetch activities
    if (callbacks?.fetchActivities) {
      callbacks.fetchActivities(workspaceSlug, projectId, issueId);
    }
  },
}));

// ============================================================================
// Legacy Interface (for backwards compatibility)
// ============================================================================

export interface IIssueLinkStoreActions {
  addLinks: (issueId: string, links: TIssueLink[]) => void;
  fetchLinks: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueLink[]>;
  createLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueLink>
  ) => Promise<TIssueLink>;
  updateLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    data: Partial<TIssueLink>
  ) => Promise<TIssueLink>;
  removeLink: (workspaceSlug: string, projectId: string, issueId: string, linkId: string) => Promise<void>;
}

export interface IIssueLinkStore extends IIssueLinkStoreActions {
  // observables
  links: TIssueLinkIdMap;
  linkMap: TIssueLinkMap;
  // computed
  issueLinks: string[] | undefined;
  // helper methods
  getLinksByIssueId: (issueId: string) => string[] | undefined;
  getLinkById: (linkId: string) => TIssueLink | undefined;
}

// ============================================================================
// Legacy Class Wrapper (for backwards compatibility)
// ============================================================================

/**
 * Legacy IssueLinkStore class wrapper.
 * Provides MobX-like API by delegating to Zustand store.
 *
 * @deprecated Use useIssueLinkStore hook directly in new code
 */
export class IssueLinkStoreLegacy implements IIssueLinkStore {
  private rootIssueDetailStore: any;
  private serviceType: TIssueServiceType;

  constructor(rootStore: any, serviceType: TIssueServiceType) {
    this.rootIssueDetailStore = rootStore;
    this.serviceType = serviceType;
  }

  // ============================================================================
  // Observable Properties (via getters)
  // ============================================================================

  get links() {
    return useIssueLinkStore.getState().links;
  }

  get linkMap() {
    return useIssueLinkStore.getState().linkMap;
  }

  // ============================================================================
  // Computed Properties
  // ============================================================================

  get issueLinks() {
    const issueId = this.rootIssueDetailStore.peekIssue?.issueId;
    return useIssueLinkStore.getState().getIssueLinks(issueId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  getLinksByIssueId = (issueId: string) => {
    return useIssueLinkStore.getState().getLinksByIssueId(issueId);
  };

  getLinkById = (linkId: string) => {
    return useIssueLinkStore.getState().getLinkById(linkId);
  };

  // ============================================================================
  // Actions
  // ============================================================================

  addLinks = (issueId: string, links: TIssueLink[]) => {
    useIssueLinkStore.getState().addLinks(issueId, links);
  };

  fetchLinks = async (workspaceSlug: string, projectId: string, issueId: string) => {
    return useIssueLinkStore.getState().fetchLinks(workspaceSlug, projectId, issueId, this.serviceType);
  };

  createLink = async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueLink>) => {
    return useIssueLinkStore.getState().createLink(workspaceSlug, projectId, issueId, data, this.serviceType, {
      updateIssueCount: (issueId, count) => {
        this.rootIssueDetailStore.rootIssueStore.issues.updateIssue(issueId, {
          link_count: count,
        });
      },
      fetchActivities: (workspaceSlug, projectId, issueId) => {
        this.rootIssueDetailStore.activity.fetchActivities(workspaceSlug, projectId, issueId);
      },
    });
  };

  updateLink = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    data: Partial<TIssueLink>
  ) => {
    return useIssueLinkStore.getState().updateLink(workspaceSlug, projectId, issueId, linkId, data, this.serviceType, {
      fetchActivities: (workspaceSlug, projectId, issueId) => {
        this.rootIssueDetailStore.activity.fetchActivities(workspaceSlug, projectId, issueId);
      },
    });
  };

  removeLink = async (workspaceSlug: string, projectId: string, issueId: string, linkId: string) => {
    return useIssueLinkStore.getState().removeLink(workspaceSlug, projectId, issueId, linkId, this.serviceType, {
      updateIssueCount: (issueId, count) => {
        this.rootIssueDetailStore.rootIssueStore.issues.updateIssue(issueId, {
          link_count: count,
        });
      },
      fetchActivities: (workspaceSlug, projectId, issueId) => {
        this.rootIssueDetailStore.activity.fetchActivities(workspaceSlug, projectId, issueId);
      },
    });
  };
}
