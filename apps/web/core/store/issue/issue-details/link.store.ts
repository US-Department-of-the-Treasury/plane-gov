import { set } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import { EIssueServiceType } from "@plane/types";
import type { TIssueLink, TIssueLinkMap, TIssueLinkIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueService } from "@/services/issue";

export interface IIssueLinkStore {
  // state
  links: TIssueLinkIdMap;
  linkMap: TIssueLinkMap;
  // helper methods
  getLinksByIssueId: (issueId: string) => string[] | undefined;
  getLinkById: (linkId: string) => TIssueLink | undefined;
  // actions
  addLinks: (issueId: string, links: TIssueLink[]) => void;
  fetchLinks: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueLink[]>;
  createLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    data: Partial<TIssueLink>,
    onIssueUpdate?: (issueId: string, data: { link_count: number }) => void,
    onFetchActivity?: () => void
  ) => Promise<TIssueLink>;
  updateLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    data: Partial<TIssueLink>,
    onFetchActivity?: () => void
  ) => Promise<TIssueLink>;
  removeLink: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    onIssueUpdate?: (issueId: string, data: { link_count: number }) => void,
    onFetchActivity?: () => void
  ) => Promise<void>;
}

// Store factory for different service types
const linkServiceMap = new Map<TIssueServiceType, IssueService>();

const getLinkService = (serviceType: TIssueServiceType): IssueService => {
  if (!linkServiceMap.has(serviceType)) {
    linkServiceMap.set(serviceType, new IssueService(serviceType));
  }
  return linkServiceMap.get(serviceType)!;
};

export const useIssueLinkStore = create<IIssueLinkStore>()(
  immer((set, get) => ({
    // state
    links: {},
    linkMap: {},

    // helper methods
    getLinksByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().links[issueId] ?? undefined;
    },

    getLinkById: (linkId: string) => {
      if (!linkId) return undefined;
      return get().linkMap[linkId] ?? undefined;
    },

    // actions
    addLinks: (issueId: string, links: TIssueLink[]) => {
      set((state) => {
        state.links[issueId] = links.map((link) => link.id);
        links.forEach((link) => {
          state.linkMap[link.id] = link;
        });
      });
    },

    fetchLinks: async (workspaceSlug: string, projectId: string, issueId: string) => {
      const service = getLinkService(EIssueServiceType.ISSUES);
      const response = await service.fetchIssueLinks(workspaceSlug, projectId, issueId);
      get().addLinks(issueId, response);
      return response;
    },

    createLink: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      data: Partial<TIssueLink>,
      onIssueUpdate?: (issueId: string, data: { link_count: number }) => void,
      onFetchActivity?: () => void
    ) => {
      const service = getLinkService(EIssueServiceType.ISSUES);
      const response = await service.createIssueLink(workspaceSlug, projectId, issueId, data);
      const issueLinkCount = get().getLinksByIssueId(issueId)?.length ?? 0;

      set((state) => {
        if (!state.links[issueId]) {
          state.links[issueId] = [];
        }
        state.links[issueId].push(response.id);
        state.linkMap[response.id] = response;
      });

      if (onIssueUpdate) {
        onIssueUpdate(issueId, {
          link_count: issueLinkCount + 1,
        });
      }

      // fetching activity
      if (onFetchActivity) {
        onFetchActivity();
      }

      return response;
    },

    updateLink: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      linkId: string,
      data: Partial<TIssueLink>,
      onFetchActivity?: () => void
    ) => {
      const service = getLinkService(EIssueServiceType.ISSUES);
      const initialData = { ...get().linkMap[linkId] };

      try {
        // Optimistic update
        set((state) => {
          Object.keys(data).forEach((key) => {
            if (state.linkMap[linkId]) {
              (state.linkMap[linkId] as Record<string, unknown>)[key] = data[key as keyof TIssueLink];
            }
          });
        });

        const response = await service.updateIssueLink(workspaceSlug, projectId, issueId, linkId, data);

        // fetching activity
        if (onFetchActivity) {
          onFetchActivity();
        }

        return response;
      } catch (error) {
        console.error("Error updating link:", error);
        // Revert on error
        set((state) => {
          Object.keys(initialData).forEach((key) => {
            if (state.linkMap[linkId]) {
              (state.linkMap[linkId] as Record<string, unknown>)[key] = initialData[key as keyof TIssueLink];
            }
          });
        });
        throw error;
      }
    },

    removeLink: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      linkId: string,
      onIssueUpdate?: (issueId: string, data: { link_count: number }) => void,
      onFetchActivity?: () => void
    ) => {
      const service = getLinkService(EIssueServiceType.ISSUES);
      const issueLinkCount = get().getLinksByIssueId(issueId)?.length ?? 0;

      await service.deleteIssueLink(workspaceSlug, projectId, issueId, linkId);

      set((state) => {
        const linkIndex = state.links[issueId]?.findIndex((_linkId) => _linkId === linkId) ?? -1;
        if (linkIndex >= 0) {
          state.links[issueId].splice(linkIndex, 1);
          delete state.linkMap[linkId];
        }
      });

      if (onIssueUpdate) {
        onIssueUpdate(issueId, {
          link_count: issueLinkCount - 1,
        });
      }

      // fetching activity
      if (onFetchActivity) {
        onFetchActivity();
      }
    },
  }))
);
